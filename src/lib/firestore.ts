import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  updateDoc,
  onSnapshot,
  runTransaction,
  type DocumentData,
  type QueryConstraint,
  type Unsubscribe,
} from "firebase/firestore";
import { getDb, isAdminEmail } from "./firebase";

export type SessionCode = "FR" | "BR" | "SI" | "SPL" | "SP" | "GD" | "GP" | "PL" | "VIP";

const PAID_SESSION_CODES = ["BR", "SI", "SP", "GD", "GP", "PL", "VIP"] as const;

function requireAdminEmail(adminEmail?: string | null) {
  if (!isAdminEmail(adminEmail)) throw new Error("Admin access required.");
}

export interface UidRecord extends DocumentData {
  uid: string;
  session_code: SessionCode | string;
  session_full_name: string;
  date_of_birth: string;
  time_of_birth: string;
  place_of_birth: string;
  city_code: string;
  user_name?: string | null;
  user_phone?: string | null;
  user_firebase_uid?: string | null;
  notes?: string | null;
  created_at?: unknown;
}

export interface SessionBooking extends DocumentData {
  user_name: string;
  user_phone: string;
  user_firebase_uid?: string | null;
  user_email?: string | null;
  date_of_birth: string;
  time_of_birth: string;
  place_of_birth: string;
  session_code: string;
  session_full_name: string;
  notes: string;
  generated_uid?: string | null;
  status: "pending" | "confirmed" | "completed";
  created_at?: { toDate?: () => Date } | unknown;
}

export interface AdminPost extends DocumentData {
  title: string;
  content: string;
  type: "announcement" | "session_update" | "insight" | "dimension_note";
  is_published: boolean;
  created_at?: { toDate?: () => Date } | unknown;
}

export interface VoiceRoom extends DocumentData {
  id?: string;
  room_name: string;
  room_password: string;
  max_seats: number;
  is_active: boolean;
  free_join?: boolean; // when true, anyone can take an unlocked seat
  is_private?: boolean;
  locked_seats?: number[]; // seat indices locked by host
  ownerId?: string | null;
  ownerName?: string | null;
  category?: string | null;
  announcement?: string | null;
  coverTheme?: string | null;
  listenerCount?: number;
  created_at?: unknown;
}

export interface VoiceParticipant extends DocumentData {
  name: string;
  initials: string;
  isMuted: boolean;
  isSpeaking?: boolean;
  isDeafened?: boolean;
  role?: "host" | "speaker" | "listener";
  photoURL?: string | null;
  seatIndex?: number | null; // 0..max_seats-1, null = no seat (lobby)
  handRaised?: boolean;
  reaction?: { emoji: string; at: number } | null;
  coins?: number;
  gifted?: number;
  joinedAt?: { toDate?: () => Date } | unknown;
}

export interface AppUser extends DocumentData {
  name: string;
  email?: string | null;
  photoURL?: string | null;
  createdAt?: unknown;
  lastSeenAt?: unknown;
}

export interface VoiceMessage extends DocumentData {
  name: string;
  initials: string;
  text: string;
  userId?: string;
  createdAt?: { toDate?: () => Date } | unknown;
}

export interface VoiceGift extends DocumentData {
  giftId: string;
  giftName: string;
  emoji: string;
  amount: number;
  fromUserId: string;
  fromName: string;
  toUserId?: string | null;
  toName?: string | null;
  createdAt?: { toDate?: () => Date } | unknown;
}

// ---- Bookings ----
export async function createBooking(data: Omit<SessionBooking, "status" | "created_at">) {
  if (!data.user_firebase_uid || !data.user_email) throw new Error("Please sign in with Google before booking.");
  if (!PAID_SESSION_CODES.includes(data.session_code as (typeof PAID_SESSION_CODES)[number])) {
    throw new Error("This session cannot be booked from this form.");
  }
  const db = getDb();
  const ref = await addDoc(collection(db, "session_bookings"), {
    ...data,
    status: "pending" as const,
    created_at: serverTimestamp(),
  });
  return ref.id;
}

export async function listBookingsForUser(firebaseUid: string): Promise<(SessionBooking & { id: string })[]> {
  const db = getDb();
  // Avoid composite index requirement: filter only, sort client-side.
  const snap = await getDocs(query(collection(db, "session_bookings"), where("user_firebase_uid", "==", firebaseUid)));
  const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as SessionBooking) }));
  list.sort((a, b) => {
    const ad = tsToDate(a.created_at)?.getTime() ?? 0;
    const bd = tsToDate(b.created_at)?.getTime() ?? 0;
    return bd - ad;
  });
  return list;
}

export async function listAllBookings(adminEmail?: string | null): Promise<(SessionBooking & { id: string })[]> {
  requireAdminEmail(adminEmail);
  const db = getDb();
  const q = query(collection(db, "session_bookings"), orderBy("created_at", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as SessionBooking) }));
}

export async function attachUidToBooking(bookingId: string, uid: string, adminEmail?: string | null) {
  requireAdminEmail(adminEmail);
  const db = getDb();
  await updateDoc(doc(db, "session_bookings", bookingId), {
    generated_uid: uid,
    status: "confirmed",
  });
}

export async function setBookingStatus(bookingId: string, status: SessionBooking["status"], adminEmail?: string | null) {
  requireAdminEmail(adminEmail);
  const db = getDb();
  await updateDoc(doc(db, "session_bookings", bookingId), { status });
}

// ---- UIDs ----
export async function createUidRecord(rec: UidRecord, adminEmail?: string | null) {
  requireAdminEmail(adminEmail);
  const db = getDb();
  await setDoc(doc(db, "uid_records", rec.uid), {
    ...rec,
    created_at: serverTimestamp(),
  });
}

export async function lookupUid(uid: string): Promise<(UidRecord & { id: string }) | null> {
  const db = getDb();
  const ref = doc(db, "uid_records", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as UidRecord) };
}

// ---- Posts ----
export async function listPublishedPosts(max = 20): Promise<(AdminPost & { id: string })[]> {
  const db = getDb();
  // Avoid composite-index requirement (where + orderBy on different fields).
  // Order by created_at only, then filter + slice client-side.
  const snap = await getDocs(query(collection(db, "admin_posts"), orderBy("created_at", "desc"), limit(max * 2)));
  const list = snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as AdminPost) }))
    .filter((p) => p.is_published === true)
    .slice(0, max);
  return list;
}

export async function listAllPosts(adminEmail?: string | null): Promise<(AdminPost & { id: string })[]> {
  requireAdminEmail(adminEmail);
  const db = getDb();
  const snap = await getDocs(query(collection(db, "admin_posts"), orderBy("created_at", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as AdminPost) }));
}

export async function createPost(post: Omit<AdminPost, "created_at">, adminEmail?: string | null) {
  requireAdminEmail(adminEmail);
  const db = getDb();
  const ref = await addDoc(collection(db, "admin_posts"), {
    ...post,
    created_at: serverTimestamp(),
  });
  return ref.id;
}

export async function updatePost(id: string, post: Partial<Omit<AdminPost, "created_at">>, adminEmail?: string | null) {
  requireAdminEmail(adminEmail);
  const db = getDb();
  await updateDoc(doc(db, "admin_posts", id), post);
}

export async function deletePost(id: string, adminEmail?: string | null) {
  requireAdminEmail(adminEmail);
  const db = getDb();
  await deleteDoc(doc(db, "admin_posts", id));
}

export async function setPostPublished(id: string, is_published: boolean, adminEmail?: string | null) {
  requireAdminEmail(adminEmail);
  const db = getDb();
  await updateDoc(doc(db, "admin_posts", id), { is_published });
}

// ---- SPL Applications ----
export interface SplApplication extends DocumentData {
  q1: string; q2: string; q3: string; q4: string; q5: string;
  q6: string; q7: string; q8: string; q9: string; q10?: string;
  q11: string; q12: string; q13: string;
  status: "pending" | "approved" | "rejected";
  submitted_at?: { toDate?: () => Date } | unknown;
}

export async function listSplApplications(adminEmail?: string | null): Promise<(SplApplication & { id: string })[]> {
  requireAdminEmail(adminEmail);
  const db = getDb();
  const snap = await getDocs(query(collection(db, "spl_applications"), orderBy("submitted_at", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as SplApplication) }));
}

export async function setSplApplicationStatus(id: string, status: SplApplication["status"], adminEmail?: string | null) {
  requireAdminEmail(adminEmail);
  const db = getDb();
  await updateDoc(doc(db, "spl_applications", id), { status });
}

// ---- Voice Room ----
export const DEFAULT_VOICE_ROOM_ID = "main_room";
const VOICE_ROOM_DOC = DEFAULT_VOICE_ROOM_ID;

function roomDoc(roomId = VOICE_ROOM_DOC) {
  return doc(getDb(), "voice_rooms", roomId);
}

function roomCollection(roomId = VOICE_ROOM_DOC, name: "participants" | "messages" | "gifts") {
  return collection(getDb(), "voice_rooms", roomId, name);
}

export async function getVoiceRoom(roomId = VOICE_ROOM_DOC): Promise<VoiceRoom | null> {
  const db = getDb();
  const snap = await getDoc(doc(db, "voice_rooms", roomId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as VoiceRoom) };
}

export function subscribeVoiceRoom(cb: (room: VoiceRoom | null) => void, roomId = VOICE_ROOM_DOC): Unsubscribe {
  const db = getDb();
  return onSnapshot(doc(db, "voice_rooms", roomId), (snap) => {
    cb(snap.exists() ? ({ id: snap.id, ...(snap.data() as VoiceRoom) }) : null);
  });
}

export function subscribeVoiceRooms(cb: (rooms: (VoiceRoom & { id: string })[]) => void): Unsubscribe {
  const db = getDb();
  const q = query(collection(db, "voice_rooms"), orderBy("updated_at", "desc"), limit(24));
  return onSnapshot(q, (snap) => {
    const rooms = snap.docs.map((d) => ({ id: d.id, ...(d.data() as VoiceRoom) }));
    cb(rooms);
  });
}

export async function createVoiceRoom(data: {
  roomId: string;
  room_name: string;
  ownerId: string;
  ownerName: string;
  max_seats?: number;
  category?: string;
  announcement?: string;
}) {
  const db = getDb();
  await setDoc(doc(db, "voice_rooms", data.roomId), {
    room_name: data.room_name,
    room_password: "",
    max_seats: data.max_seats ?? 12,
    free_join: true,
    is_private: false,
    locked_seats: [],
    is_active: true,
    ownerId: data.ownerId,
    ownerName: data.ownerName,
    category: data.category ?? "Open Talk",
    announcement: data.announcement ?? "",
    coverTheme: "cosmic-gold",
    listenerCount: 0,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  }, { merge: true });
}

export async function setVoiceRoom(data: Partial<Omit<VoiceRoom, "created_at">>, adminEmail?: string | null, roomId = VOICE_ROOM_DOC) {
  requireAdminEmail(adminEmail);
  const db = getDb();
  await setDoc(
    doc(db, "voice_rooms", roomId),
    { ...data, created_at: serverTimestamp() },
    { merge: true },
  );
}

export async function setVoiceRoomActive(is_active: boolean, adminEmail?: string | null, roomId = VOICE_ROOM_DOC) {
  requireAdminEmail(adminEmail);
  const db = getDb();
  await setDoc(doc(db, "voice_rooms", roomId), { is_active, updated_at: serverTimestamp() }, { merge: true });
}

// Participants
export async function joinVoiceRoom(
  userId: string,
  data: { name: string; initials: string; photoURL?: string | null; role?: "host" | "speaker" | "listener" },
  roomId = VOICE_ROOM_DOC,
) {
  const db = getDb();
  const participantRef = doc(db, "voice_rooms", roomId, "participants", userId);
  const existingSnap = await getDoc(participantRef);
  const existing = existingSnap.exists() ? (existingSnap.data() as VoiceParticipant) : null;
  const role = data.role ?? existing?.role ?? "listener";
  await setDoc(doc(db, "voice_rooms", roomId), {
    room_name: "Hiren Voice Room",
    max_seats: 12,
    free_join: true,
    is_private: false,
    locked_seats: [],
    is_active: true,
    listenerCount: 0,
    updated_at: serverTimestamp(),
  }, { merge: true });
  await setDoc(participantRef, {
    name: data.name,
    initials: data.initials,
    photoURL: data.photoURL ?? null,
    role,
    isMuted: existing?.isMuted ?? true,
    isSpeaking: existing?.isSpeaking ?? false,
    isDeafened: existing?.isDeafened ?? false,
    seatIndex: existing?.seatIndex ?? null,
    handRaised: existing?.handRaised ?? false,
    reaction: existing?.reaction ?? null,
    coins: existing?.coins ?? 2500,
    gifted: existing?.gifted ?? 0,
    joinedAt: existing?.joinedAt ?? serverTimestamp(),
    lastSeenAt: serverTimestamp(),
  }, { merge: true });
  console.log("[firestore] joinVoiceRoom write OK", userId);
}

// Seat allocation — returns true on success, false if seat taken/locked.
export async function takeSeat(userId: string, seatIndex: number, roomId = VOICE_ROOM_DOC): Promise<boolean> {
  const db = getDb();
  const ok = await runTransaction(db, async (transaction) => {
    const roomRef = doc(db, "voice_rooms", roomId);
    const seatRef = doc(db, "voice_rooms", roomId, "seats", String(seatIndex));
    const participantRef = doc(db, "voice_rooms", roomId, "participants", userId);
    const roomSnap = await transaction.get(roomRef);
    const seatSnap = await transaction.get(seatRef);
    const participantSnap = await transaction.get(participantRef);
    const locked: number[] = (roomSnap.data()?.locked_seats as number[] | undefined) ?? [];
    if (locked.includes(seatIndex)) return false;
    if (seatSnap.exists() && seatSnap.data()?.occupiedBy && seatSnap.data()?.occupiedBy !== userId) return false;
    const previousSeat = (participantSnap.data() as VoiceParticipant | undefined)?.seatIndex;
    if (typeof previousSeat === "number" && previousSeat !== seatIndex) {
      transaction.delete(doc(db, "voice_rooms", roomId, "seats", String(previousSeat)));
    }
    transaction.set(seatRef, { occupiedBy: userId, updatedAt: serverTimestamp() }, { merge: true });
    transaction.set(participantRef, {
      seatIndex,
      isMuted: true,
      lastSeatAt: serverTimestamp(),
    }, { merge: true });
    return true;
  });
  if (!ok) return false;
  console.log("[firestore] takeSeat OK", userId, seatIndex);
  return true;
}

export async function leaveSeat(userId: string, roomId = VOICE_ROOM_DOC) {
  const db = getDb();
  const participantRef = doc(db, "voice_rooms", roomId, "participants", userId);
  const snap = await getDoc(participantRef);
  const seatIndex = (snap.data() as VoiceParticipant | undefined)?.seatIndex;
  await updateDoc(participantRef, {
    seatIndex: null,
    isMuted: true,
  });
  if (typeof seatIndex === "number") await deleteDoc(doc(db, "voice_rooms", roomId, "seats", String(seatIndex))).catch(() => {});
}

export async function setHandRaised(userId: string, handRaised: boolean, roomId = VOICE_ROOM_DOC) {
  const db = getDb();
  await updateDoc(doc(db, "voice_rooms", roomId, "participants", userId), { handRaised });
}

export async function sendReaction(userId: string, emoji: string, roomId = VOICE_ROOM_DOC) {
  const db = getDb();
  await updateDoc(doc(db, "voice_rooms", roomId, "participants", userId), {
    reaction: { emoji, at: Date.now() },
  });
}

export async function toggleSeatLock(seatIndex: number, lock: boolean, adminEmail?: string | null, roomId = VOICE_ROOM_DOC) {
  requireAdminEmail(adminEmail);
  const db = getDb();
  const ref = doc(db, "voice_rooms", roomId);
  const snap = await getDoc(ref);
  const locked: number[] = (snap.data()?.locked_seats as number[] | undefined) ?? [];
  const next = lock
    ? Array.from(new Set([...locked, seatIndex]))
    : locked.filter((i) => i !== seatIndex);
  await setDoc(ref, { locked_seats: next }, { merge: true });
  // If locking and someone is in that seat, evict them.
  if (lock) {
    const partsSnap = await getDocs(collection(db, "voice_rooms", roomId, "participants"));
    for (const d of partsSnap.docs) {
      if ((d.data() as VoiceParticipant).seatIndex === seatIndex) {
        await updateDoc(d.ref, { seatIndex: null, isMuted: true });
      }
    }
    await deleteDoc(doc(db, "voice_rooms", roomId, "seats", String(seatIndex))).catch(() => {});
  }
}

export async function setRoomFreeJoin(free: boolean, adminEmail?: string | null, roomId = VOICE_ROOM_DOC) {
  requireAdminEmail(adminEmail);
  const db = getDb();
  await setDoc(doc(db, "voice_rooms", roomId), { free_join: free, updated_at: serverTimestamp() }, { merge: true });
}

export async function setRoomPrivacy(is_private: boolean, adminEmail?: string | null, roomId = VOICE_ROOM_DOC) {
  requireAdminEmail(adminEmail);
  const db = getDb();
  await setDoc(doc(db, "voice_rooms", roomId), { is_private, updated_at: serverTimestamp() }, { merge: true });
}

export async function leaveVoiceRoom(userId: string, roomId = VOICE_ROOM_DOC) {
  const db = getDb();
  await leaveSeat(userId, roomId).catch(() => {});
  await deleteDoc(doc(db, "voice_rooms", roomId, "participants", userId));
  console.log("[firestore] leaveVoiceRoom write OK", userId);
}

export async function setMyMuteState(userId: string, isMuted: boolean, roomId = VOICE_ROOM_DOC) {
  const db = getDb();
  await updateDoc(doc(db, "voice_rooms", roomId, "participants", userId), { isMuted });
  console.log("[firestore] mute state →", isMuted);
}

export async function setMySpeakingState(userId: string, isSpeaking: boolean, roomId = VOICE_ROOM_DOC) {
  const db = getDb();
  await updateDoc(doc(db, "voice_rooms", roomId, "participants", userId), { isSpeaking });
}

export async function setMyDeafenState(userId: string, isDeafened: boolean, roomId = VOICE_ROOM_DOC) {
  const db = getDb();
  await updateDoc(doc(db, "voice_rooms", roomId, "participants", userId), { isDeafened });
}

export function subscribeParticipants(cb: (list: (VoiceParticipant & { id: string })[]) => void, roomId = VOICE_ROOM_DOC): Unsubscribe {
  const db = getDb();
  return onSnapshot(collection(db, "voice_rooms", roomId, "participants"), (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as VoiceParticipant) }));
    console.log("[firestore] participants snapshot", list.length);
    cb(list);
  });
}

// Messages
export async function sendVoiceMessage(data: { name: string; initials: string; text: string; userId: string; photoURL?: string | null }, roomId = VOICE_ROOM_DOC) {
  const db = getDb();
  await addDoc(collection(db, "voice_rooms", roomId, "messages"), {
    ...data,
    photoURL: data.photoURL ?? null,
    createdAt: serverTimestamp(),
  });
  console.log("[firestore] sendVoiceMessage write OK");
}

export function subscribeMessages(cb: (list: (VoiceMessage & { id: string })[]) => void, max = 50, roomId = VOICE_ROOM_DOC): Unsubscribe {
  const db = getDb();
  const q = query(collection(db, "voice_rooms", roomId, "messages"), orderBy("createdAt", "desc"), limit(max));
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as VoiceMessage) }));
    console.log("[firestore] messages snapshot", list.length);
    cb(list);
  });
}

export async function deleteVoiceMessage(id: string, adminEmail?: string | null, roomId = VOICE_ROOM_DOC) {
  requireAdminEmail(adminEmail);
  const db = getDb();
  await deleteDoc(doc(db, "voice_rooms", roomId, "messages", id));
}

export async function kickParticipant(userId: string, adminEmail?: string | null, roomId = VOICE_ROOM_DOC) {
  requireAdminEmail(adminEmail);
  const db = getDb();
  await leaveSeat(userId, roomId).catch(() => {});
  await deleteDoc(doc(db, "voice_rooms", roomId, "participants", userId));
}

export async function sendVoiceGift(data: {
  giftId: string;
  giftName: string;
  emoji: string;
  amount: number;
  fromUserId: string;
  fromName: string;
  toUserId?: string | null;
  toName?: string | null;
}, roomId = VOICE_ROOM_DOC) {
  const db = getDb();
  await addDoc(collection(db, "voice_rooms", roomId, "gifts"), {
    ...data,
    createdAt: serverTimestamp(),
  });
}

export function subscribeGifts(cb: (list: (VoiceGift & { id: string })[]) => void, max = 30, roomId = VOICE_ROOM_DOC): Unsubscribe {
  const db = getDb();
  const q = query(collection(db, "voice_rooms", roomId, "gifts"), orderBy("createdAt", "desc"), limit(max));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as VoiceGift) })));
  });
}

// ---- Users ----
export async function upsertAppUser(userId: string, data: { name: string; email?: string | null; photoURL?: string | null }) {
  const db = getDb();
  await setDoc(
    doc(db, "users", userId),
    {
      name: data.name,
      email: data.email ?? null,
      photoURL: data.photoURL ?? null,
      lastSeenAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );
  console.log("[firestore] upsertAppUser OK", userId);
}

// ---- Admin Roles ----
export type AdminRoleType = "superadmin" | "admin" | "viewer";

export interface AdminRoleRecord extends DocumentData {
  email: string;
  role: AdminRoleType;
  displayName: string;
  isActive: boolean;
  addedAt?: unknown;
  addedBy?: string;
}

export async function getAdminRole(email: string): Promise<{
  role: AdminRoleType | null;
  displayName: string;
  isActive: boolean;
}> {
  const db = getDb();
  const snap = await getDoc(doc(db, "admin_roles", email.toLowerCase()));
  if (!snap.exists()) return { role: null, displayName: "", isActive: false };
  const d = snap.data() as AdminRoleRecord;
  return {
    role: d.isActive ? d.role : null,
    displayName: d.displayName ?? "",
    isActive: d.isActive ?? false,
  };
}

export async function listAdminRoles(): Promise<(AdminRoleRecord & { id: string })[]> {
  const db = getDb();
  const snap = await getDocs(collection(db, "admin_roles"));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as AdminRoleRecord) }));
}

export async function setAdminRole(
  email: string,
  role: "admin" | "viewer",
  displayName: string,
  byEmail: string,
) {
  const db = getDb();
  await setDoc(doc(db, "admin_roles", email.toLowerCase()), {
    email: email.toLowerCase(),
    role,
    displayName,
    addedAt: serverTimestamp(),
    addedBy: byEmail,
    isActive: true,
  });
}

export async function revokeAdminRole(email: string) {
  const db = getDb();
  await updateDoc(doc(db, "admin_roles", email.toLowerCase()), { isActive: false });
}

export async function restoreAdminRole(email: string) {
  const db = getDb();
  await updateDoc(doc(db, "admin_roles", email.toLowerCase()), { isActive: true });
}

const SUPERADMIN_EMAIL = "hirenkundliofficial@gmail.com";

let _superAdminInitPromise: Promise<void> | null = null;

/**
 * One-time bootstrap: ensures the seed superadmin doc exists in admin_roles,
 * a default admin_session_password/config doc exists, and the voice_rooms/main_room
 * doc exists with safe defaults. Idempotent + memoized.
 */
export async function initializeSuperAdmin(): Promise<void> {
  if (_superAdminInitPromise) return _superAdminInitPromise;
  _superAdminInitPromise = (async () => {
    const db = getDb();

    // 1) Seed superadmin role doc
    try {
      const ref = doc(db, "admin_roles", SUPERADMIN_EMAIL);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(ref, {
          email: SUPERADMIN_EMAIL,
          role: "superadmin" as AdminRoleType,
          displayName: "Hiren",
          isActive: true,
          addedAt: serverTimestamp(),
          addedBy: "system",
        });
      }
    } catch {
      // Permissions may block when no user is signed in — safe to ignore.
    }

    // 2) Seed admin session password
    try {
      const ref = doc(db, "admin_session_password", "config");
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(ref, {
          password: "hiren2025",
          updatedAt: serverTimestamp(),
          updatedBy: "system",
        });
      }
    } catch { /* ignore */ }

    // 3) Seed voice room defaults
    try {
      const ref = doc(db, "voice_rooms", VOICE_ROOM_DOC);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(ref, {
          room_name: "Hiren Voice Room",
          room_password: "clarity2025",
          max_seats: 12,
          free_join: true,
          is_private: false,
          locked_seats: [],
          is_active: false,
          updated_at: serverTimestamp(),
          updated_by: "system",
        });
      }
    } catch { /* ignore */ }
  })();
  return _superAdminInitPromise;
}

export async function getAdminSessionPassword(): Promise<string> {
  const db = getDb();
  const snap = await getDoc(doc(db, "admin_session_password", "config"));
  return snap.exists() ? ((snap.data().password as string) ?? "hiren2025") : "hiren2025";
}

export async function updateAdminSessionPassword(newPassword: string, byEmail: string) {
  const db = getDb();
  await setDoc(doc(db, "admin_session_password", "config"), {
    password: newPassword,
    updatedAt: serverTimestamp(),
    updatedBy: byEmail,
  });
}

// Helpers
export function tsToDate(ts: unknown): Date | null {
  if (!ts) return null;
  if (ts instanceof Date) return ts;
  if (typeof ts === "object" && ts !== null && "toDate" in ts && typeof (ts as { toDate: () => Date }).toDate === "function") {
    return (ts as { toDate: () => Date }).toDate();
  }
  return null;
}

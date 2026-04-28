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
  room_name: string;
  room_password: string;
  max_seats: number;
  is_active: boolean;
  created_at?: unknown;
}

export interface VoiceParticipant extends DocumentData {
  name: string;
  initials: string;
  isMuted: boolean;
  joinedAt?: { toDate?: () => Date } | unknown;
}

export interface VoiceMessage extends DocumentData {
  name: string;
  initials: string;
  text: string;
  userId?: string;
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
  const snap = await getDocs(query(collection(db, "session_bookings"), where("user_firebase_uid", "==", firebaseUid), orderBy("created_at", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as SessionBooking) }));
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
  const constraints: QueryConstraint[] = [
    where("is_published", "==", true),
    orderBy("created_at", "desc"),
    limit(max),
  ];
  const snap = await getDocs(query(collection(db, "admin_posts"), ...constraints));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as AdminPost) }));
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
const VOICE_ROOM_DOC = "main_room";

export async function getVoiceRoom(): Promise<VoiceRoom | null> {
  const db = getDb();
  const snap = await getDoc(doc(db, "voice_rooms", VOICE_ROOM_DOC));
  if (!snap.exists()) return null;
  return snap.data() as VoiceRoom;
}

export function subscribeVoiceRoom(cb: (room: VoiceRoom | null) => void): Unsubscribe {
  const db = getDb();
  return onSnapshot(doc(db, "voice_rooms", VOICE_ROOM_DOC), (snap) => {
    cb(snap.exists() ? (snap.data() as VoiceRoom) : null);
  });
}

export async function setVoiceRoom(data: Partial<Omit<VoiceRoom, "created_at">>, adminEmail?: string | null) {
  requireAdminEmail(adminEmail);
  const db = getDb();
  await setDoc(
    doc(db, "voice_rooms", VOICE_ROOM_DOC),
    { ...data, created_at: serverTimestamp() },
    { merge: true },
  );
}

export async function setVoiceRoomActive(is_active: boolean, adminEmail?: string | null) {
  requireAdminEmail(adminEmail);
  const db = getDb();
  await setDoc(doc(db, "voice_rooms", VOICE_ROOM_DOC), { is_active }, { merge: true });
}

// Participants
export async function joinVoiceRoom(userId: string, data: { name: string; initials: string }) {
  const db = getDb();
  await setDoc(doc(db, "voice_rooms", VOICE_ROOM_DOC, "participants", userId), {
    ...data,
    isMuted: false,
    joinedAt: serverTimestamp(),
  });
}

export async function leaveVoiceRoom(userId: string) {
  const db = getDb();
  await deleteDoc(doc(db, "voice_rooms", VOICE_ROOM_DOC, "participants", userId));
}

export async function setMyMuteState(userId: string, isMuted: boolean) {
  const db = getDb();
  await updateDoc(doc(db, "voice_rooms", VOICE_ROOM_DOC, "participants", userId), { isMuted });
}

export function subscribeParticipants(cb: (list: (VoiceParticipant & { id: string })[]) => void): Unsubscribe {
  const db = getDb();
  return onSnapshot(collection(db, "voice_rooms", VOICE_ROOM_DOC, "participants"), (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as VoiceParticipant) })));
  });
}

// Messages
export async function sendVoiceMessage(data: { name: string; initials: string; text: string; userId: string }) {
  const db = getDb();
  await addDoc(collection(db, "voice_rooms", VOICE_ROOM_DOC, "messages"), {
    ...data,
    createdAt: serverTimestamp(),
  });
}

export function subscribeMessages(cb: (list: (VoiceMessage & { id: string })[]) => void, max = 50): Unsubscribe {
  const db = getDb();
  const q = query(collection(db, "voice_rooms", VOICE_ROOM_DOC, "messages"), orderBy("createdAt", "desc"), limit(max));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as VoiceMessage) })));
  });
}

export async function deleteVoiceMessage(id: string, adminEmail?: string | null) {
  requireAdminEmail(adminEmail);
  const db = getDb();
  await deleteDoc(doc(db, "voice_rooms", VOICE_ROOM_DOC, "messages", id));
}

export async function kickParticipant(userId: string, adminEmail?: string | null) {
  requireAdminEmail(adminEmail);
  const db = getDb();
  await deleteDoc(doc(db, "voice_rooms", VOICE_ROOM_DOC, "participants", userId));
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

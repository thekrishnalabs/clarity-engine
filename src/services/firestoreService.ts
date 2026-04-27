// Firestore service — singleton accessor for the modular Firestore SDK.
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { getFirebaseApp } from "./firebaseConfig";

let _db: Firestore | null = null;
let _storage: FirebaseStorage | null = null;

export function getFirestoreDb(): Firestore {
  if (typeof window === "undefined") {
    throw new Error("Firestore is browser-only in this app.");
  }
  if (_db) return _db;
  _db = getFirestore(getFirebaseApp());
  return _db;
}

export function getFirebaseStorage(): FirebaseStorage {
  if (typeof window === "undefined") {
    throw new Error("Firebase Storage is browser-only in this app.");
  }
  if (_storage) return _storage;
  _storage = getStorage(getFirebaseApp());
  return _storage;
}

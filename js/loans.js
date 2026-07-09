// loans.js

import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const loansCollection = collection(db, "loans");

export async function addLoan(loan) {
  return await addDoc(loansCollection, loan);
}

export async function getLoans() {
  const snapshot = await getDocs(loansCollection);

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

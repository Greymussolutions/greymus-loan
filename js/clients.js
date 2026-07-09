// clients.js

import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const clientsCollection = collection(db, "clients");

export async function addClient(client) {
  return await addDoc(clientsCollection, client);
}

export async function getClients() {
  const snapshot = await getDocs(clientsCollection);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

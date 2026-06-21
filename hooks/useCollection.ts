"use client";

import { useEffect, useState } from "react";
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, query, orderBy, serverTimestamp, DocumentData,
} from "firebase/firestore";
import { db } from "../lib/firebase";

export function useCollection<T extends { id: string }>(
  collectionName: string,
  orderField: string = "createdAt"
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, collectionName), orderBy(orderField, "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setData(snap.docs.map((d) => ({ id: d.id, ...d.data() } as T)));
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      }
    );
    return unsub;
  }, [collectionName, orderField]);

  async function add(item: Omit<T, "id" | "createdAt">) {
    try {
      await addDoc(collection(db, collectionName), {
        ...item,
        createdAt: Date.now(),
      });
    } catch (e: any) {
      console.error(e);
      throw e;
    }
  }

  async function update(id: string, item: Partial<Omit<T, "id">>) {
    try {
      await updateDoc(doc(db, collectionName, id), item as DocumentData);
    } catch (e: any) {
      console.error(e);
      throw e;
    }
  }

  async function remove(id: string) {
    try {
      await deleteDoc(doc(db, collectionName, id));
    } catch (e: any) {
      console.error(e);
      throw e;
    }
  }

  return { data, loading, error, add, update, remove };
}
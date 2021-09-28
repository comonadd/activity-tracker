import { DbHandle, createIDBEntity, db } from "~/db";
import { USER_LOG_STORE_NAME } from "~/constants";

export const UserLog = createIDBEntity<UserLogMessage, "created">(
  db,
  USER_LOG_STORE_NAME,
  "created"
);

export enum UserLogMessageType {
  Warning,
  Error,
  Info,
}

export interface UserLogMessage {
  type: UserLogMessageType;
  msg: string;
  created: Date;
}

export const saveUserLogMessage = async (
  db: DbHandle,
  msg: Omit<UserLogMessage, "created">
) => {
  const tx = db.transaction(USER_LOG_STORE_NAME, "readwrite");
  await tx.store.put({ ...msg, created: new Date() });
};

export const clearUserLogs = async () => {
  const tx = (await db).transaction(USER_LOG_STORE_NAME, "readwrite");
  await tx.store.clear();
};

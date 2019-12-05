import { ObjectId } from "mongodb";

import {
  arrayProp as PropertyArray,
  getModelForClass,
  prop as Property,
} from "@typegoose/typegoose";

export class User {
  readonly _id: ObjectId;

  @Property({ index: true, unique: true })
  run: string;

  @PropertyArray({ items: String, default: [] })
  names: string[];

  @PropertyArray({ items: String, default: [] })
  lastNames: string[];

  @Property()
  email?: string;

  @Property()
  accessToken?: string;
}

export const UserModel = getModelForClass(User);

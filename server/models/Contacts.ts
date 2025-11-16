import mongoose, { Schema, type Model, type Document, Types } from "mongoose";

interface IContact extends Document {
    _id: Types.ObjectId;
    user: string;
    contactName: string;
    contactAlias: string;
}

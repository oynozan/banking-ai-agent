import mongoose, { Schema, type Model, type Document, Types } from "mongoose";

export interface IUser extends Document {
    id: string;
    balance: number;
    name: string;
    _id: Types.ObjectId;
}

const UserSchema = new Schema<IUser>(
    {
        id: { type: String, required: true, unique: true },
        balance: { type: Number },
        name: { type: String, required: true },
    },
    { versionKey: false }
);

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
export default User;

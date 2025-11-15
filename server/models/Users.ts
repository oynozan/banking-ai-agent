import mongoose, { Schema, type Model, type Document, Types } from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser extends Document {
    id: string;
    balance: number;
    name: string;
    password: string;
    _id: Types.ObjectId;
}

const UserSchema = new Schema<IUser>(
    {
        id: { type: String, required: true, unique: true },
        balance: { type: Number },
        password: { type: String, required: true },
        name: { type: String, required: true },
    },
    { versionKey: false },
);

// Hash password on create/update if modified
UserSchema.pre("save", async function (next) {
    const user = this as unknown as IUser & mongoose.Document;
    if (!user.isModified("password")) return next();
    try {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
        next();
    } catch (err) {
        next(err as any);
    }
});

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
export default User;

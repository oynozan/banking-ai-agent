import mongoose, { Schema, type Model, type Document, Types } from "mongoose";

type ICurrencies = "USD" | "EUR" | "PLN";
export interface IAccount extends Document {
    _id: Types.ObjectId;
    user: {
        id: string;
        name: string;
    };
    name: string;
    iban: string;
    balance: number;
    type: "savings" | "checking" | "credit";
    currency: ICurrencies;
    createdAt: Date;
}

const AccountSchema = new Schema<IAccount>(
    {
        user: {
            id: { type: String, required: true },
            name: { type: String, required: true },
        },
        name: { type: String, required: true },
        iban: { type: String, required: true, unique: true },
        balance: { type: Number, required: true },
        type: { type: String, enum: ["savings", "checking", "credit"], required: true },
        currency: { type: String, enum: ["USD", "EUR", "PLN"], required: true },
        createdAt: { type: Date, required: true, default: Date.now },
    },
    { versionKey: false, collection: "accounts" },
);

const Accounts: Model<IAccount> =
    mongoose.models.Account || mongoose.model<IAccount>("Account", AccountSchema);
export default Accounts;

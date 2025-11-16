import mongoose, { Schema, type Model, type Document, Types } from "mongoose";

export interface IContact extends Document {
    _id: Types.ObjectId;
    user: {
        id: string;
        name?: string;
    };
    contactName?: string;
    contactAlias: string;
    iban: string;
    aliasLower: string;
    createdAt: Date;
}

const ContactSchema = new Schema<IContact>(
    {
        user: {
            id: { type: String, required: true },
            name: { type: String },
        },
        contactName: { type: String },
        contactAlias: { type: String, required: true },
        aliasLower: { type: String, required: true },
        iban: { type: String, required: true },
        createdAt: { type: Date, required: true, default: Date.now },
    },
    { versionKey: false },
);

ContactSchema.index({ "user.id": 1, aliasLower: 1 }, { unique: true });
ContactSchema.index({ "user.id": 1, iban: 1 }, { unique: true });

const Contact: Model<IContact> =
    mongoose.models.Contact || mongoose.model<IContact>("Contact", ContactSchema);
export default Contact;

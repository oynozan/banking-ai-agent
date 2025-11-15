"use client";

import clsx from "clsx";
import { useState } from "react";
import { ArrowRight } from "lucide-react";

import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Send() {
    const [activeTab, setActiveTab] = useState<"internal" | "external">("internal");

    const handleTabClick = (tab: "internal" | "external") => {
        setActiveTab(tab);
    };

    return (
        <div id="send">
            <div className="flex items-center gap-6 mb-8">
                <div>
                    <h1 className="text-3xl text-white mb-1">Money Transfer</h1>
                    <p className="text-gray-400">
                        Transfer money to your other accounts or to someone else instantly
                    </p>
                </div>
            </div>

            <h2>Send your money to...</h2>
            <div className="flex flex-col gap-4 mt-2">
                <div className="bg-card rounded-sm border border-gold/30 transition-all shadow-xl flex items-center">
                    <button
                        className={clsx(
                            "w-1/2 p-4 border-r border-gold/30",
                            activeTab === "internal" ? "bg-gold text-black" : "",
                        )}
                        onClick={() => handleTabClick("internal")}
                    >
                        Between Accounts
                    </button>
                    <button
                        className={clsx(
                            "w-1/2 p-4",
                            activeTab === "external" ? "bg-gold text-black" : "",
                        )}
                        onClick={() => handleTabClick("external")}
                    >
                        Someone Else
                    </button>
                </div>
            </div>

            <div className="mt-8">
                {activeTab === "internal" && <InternalTransfer />}
                {activeTab === "external" && <ExternalTransfer />}
            </div>
        </div>
    );
}

function InternalTransfer() {
    return (
        <div>
            <h2>Send money between your accounts</h2>
            <div className="bg-card rounded-sm border border-gold/30 transition-all shadow-xl p-8 flex flex-col gap-6 mt-2">
                <div className="flex items-top gap-4">
                    <section className="flex-1">
                        <h3 className="text-white">From</h3>
                        <p className="text-gray-400 mb-2">
                            Choose the account you want to send from
                        </p>
                        <Select>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select a fruit" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectLabel>Fruits</SelectLabel>
                                    <SelectItem value="apple">Apple</SelectItem>
                                    <SelectItem value="banana">Banana</SelectItem>
                                    <SelectItem value="blueberry">Blueberry</SelectItem>
                                    <SelectItem value="grapes">Grapes</SelectItem>
                                    <SelectItem value="pineapple">Pineapple</SelectItem>
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </section>
                    <div className="flex items-center justify-center">
                        <ArrowRight className="w-5 h-5" />
                    </div>
                    <section className="flex-1">
                        <h3 className="text-white">To</h3>
                        <p className="text-gray-400 mb-2">Choose the account you want to send to</p>
                        <Select>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select a fruit" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectLabel>Fruits</SelectLabel>
                                    <SelectItem value="apple">Apple</SelectItem>
                                    <SelectItem value="banana">Banana</SelectItem>
                                    <SelectItem value="blueberry">Blueberry</SelectItem>
                                    <SelectItem value="grapes">Grapes</SelectItem>
                                    <SelectItem value="pineapple">Pineapple</SelectItem>
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </section>
                </div>

                <Separator />

                <section>
                    <h3 className="text-white">Amount</h3>
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-gray-400">Enter the amount you want to send</p>
                        <p className="text-gray-400">
                            Available balance: <span className="text-gold">1000</span>
                        </p>
                    </div>
                    <Input type="number" placeholder="Enter the amount" className="w-full" />
                </section>

                <Separator />

                <section className="w-full flex items-end justify-end gap-2">
                    <Button>Send Money</Button>
                </section>
            </div>
        </div>
    );
}

function ExternalTransfer() {
    return (
        <div>
            <h2>Someone Else</h2>
        </div>
    );
}

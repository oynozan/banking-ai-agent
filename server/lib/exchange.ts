const cache: {
    data: {
        PLN: number;
        EUR: number;
        USD: number;
    } | null;
    lastUpdated: number;
} = {
    data: null,
    lastUpdated: 0,
};

const MAX_CACHE_AGE = 1000 * 60 * 60 * 24; // 24 hours

export default async function plnToOthers(amount: number) {
    if (cache.data && cache.lastUpdated > Date.now() - MAX_CACHE_AGE) {
        return cache.data;
    }

    const response = await fetch(`${process.env.EXCHANGE_API_ENDPOINT}/PLN`);
    const data = await response.json();

    if (data?.success) {
        const returnData = {
            PLN: amount,
            EUR: data.rates.EUR * amount,
            USD: data.rates.USD * amount,
        };
        cache.data = returnData;
        cache.lastUpdated = Date.now();
        return returnData;
    } else {
        // fallback
        return {
            PLN: amount,
            EUR: amount * 0.24,
            USD: amount * 0.27,
        };
    }
}

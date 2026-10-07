import {
    isSupportedCurrency,
    getRates,
    type SupportedCurrency,
} from "./rates";

import {
    BUY_SPREAD_PERCENT,
    SELL_SPREAD_PERCENT,
} from "../config/quote";

export type QuoteType = "buy" | "sell" | "exchange";

export interface QuoteResponse {
    type: QuoteType;
    fromCurrency: SupportedCurrency;
    toCurrency: SupportedCurrency;
    fromAmount: string;
    toAmount: string;
    midRate: string;
    appliedRate: string;
    fee: string;
    feeSide: "from" | "to" | "none";
    rateFetchedAt: Date;
    rateStale: boolean;
}

interface GetQuoteParams {
    type: string;
    from: string;
    to: string;
    amount: string;
}

class QuoteError extends Error {
    constructor(
        public code: string,
        message: string
    ) {
        super(message);
        this.name = "QuoteError";
    }
}

/**
 * Multiplica dos números decimales representados como strings
 * sin convertirlos a Number, para evitar pérdida de precisión.
 */
function multiplyDecimalStrings(
    valueA: string,
    valueB: string
): string {
    const [integerA, decimalA = ""] = valueA.split(".");
    const [integerB, decimalB = ""] = valueB.split(".");

    const digitsA = `${integerA}${decimalA}`;
    const digitsB = `${integerB}${decimalB}`;

    const product =
        BigInt(digitsA) * BigInt(digitsB);

    const decimalPlaces =
        decimalA.length + decimalB.length;

    if (decimalPlaces === 0) {
        return product.toString();
    }

    const productString = product
        .toString()
        .padStart(decimalPlaces + 1, "0");

    const integerPart = productString.slice(
        0,
        -decimalPlaces
    );

    const decimalPart = productString.slice(
        -decimalPlaces
    );

    const normalizedDecimal =
        decimalPart.replace(/0+$/, "");

    if (!normalizedDecimal) {
        return integerPart;
    }

    return `${integerPart}.${normalizedDecimal}`;
}

function subtractDecimalStrings(
    valueA: string,
    valueB: string
): string {
    const [integerA, decimalA = ""] = valueA.split(".");
    const [integerB, decimalB = ""] = valueB.split(".");

    const scale = Math.max(
        decimalA.length,
        decimalB.length
    );

    const digitsA = BigInt(
        `${integerA}${decimalA.padEnd(scale, "0")}`
    );

    const digitsB = BigInt(
        `${integerB}${decimalB.padEnd(scale, "0")}`
    );

    if (digitsA < digitsB) {
        throw new QuoteError(
            "INVALID_CALCULATION",
            "No se puede obtener un resultado negativo"
        );
    }

    const difference = digitsA - digitsB;

    if (scale === 0) {
        return difference.toString();
    }

    const differenceString = difference
        .toString()
        .padStart(scale + 1, "0");

    const integerPart = differenceString.slice(
        0,
        -scale
    );

    const decimalPart = differenceString
        .slice(-scale)
        .replace(/0+$/, "");

    if (!decimalPart) {
        return integerPart;
    }

    return `${integerPart}.${decimalPart}`;
}

function divideDecimalStrings(
    valueA: string,
    valueB: string,
    decimalPlaces = 8
): string {
    const [integerA, decimalA = ""] = valueA.split(".");
    const [integerB, decimalB = ""] = valueB.split(".");

    const digitsA = BigInt(`${integerA}${decimalA}`);
    const digitsB = BigInt(`${integerB}${decimalB}`);

    if (digitsB === 0n) {
        throw new QuoteError(
            "INVALID_CALCULATION",
            "No se puede dividir por cero"
        );
    }

    const numerator =
        digitsA *
        10n ** BigInt(
            decimalB.length + decimalPlaces
        );

    const denominator =
        digitsB *
        10n ** BigInt(decimalA.length);

    let quotient = numerator / denominator;
    const remainder = numerator % denominator;

    // Redondeo al decimal solicitado.
    if (remainder * 2n >= denominator) {
        quotient += 1n;
    }

    const quotientString = quotient
        .toString()
        .padStart(decimalPlaces + 1, "0");

    const integerPart = quotientString.slice(
        0,
        -decimalPlaces
    );

    const decimalPart = quotientString
        .slice(-decimalPlaces)
        .replace(/0+$/, "");

    if (!decimalPart) {
        return integerPart;
    }

    return `${integerPart}.${decimalPart}`;
}

function normalizeAmount(amount: string): string {
    if (!/^\d+(\.\d+)?$/.test(amount)) {
        throw new QuoteError(
            "INVALID_AMOUNT",
            "El monto debe ser un número mayor que cero"
        );
    }

    const normalized = amount.replace(/^0+(?=\d)/, "");

    if (Number(normalized) <= 0) {
        throw new QuoteError(
            "INVALID_AMOUNT",
            "El monto debe ser mayor que cero"
        );
    }

    return normalized;
}

function normalizeType(type: string): QuoteType {
    const normalized = type.toLowerCase();

    if (
        normalized !== "buy" &&
        normalized !== "sell" &&
        normalized !== "exchange"
    ) {
        throw new QuoteError(
            "VALIDATION_ERROR",
            "El tipo de operación debe ser buy, sell o exchange"
        );
    }

    return normalized;
}

function normalizeCurrency(
    currency: string,
    fieldName: string
): SupportedCurrency {
    const normalized = currency.toUpperCase();

    if (!isSupportedCurrency(normalized)) {
        throw new QuoteError(
            "INVALID_CURRENCY",
            `Moneda ${fieldName} no soportada: ${currency}`
        );
    }

    return normalized;
}

export async function getQuote(
    params: GetQuoteParams
): Promise<QuoteResponse> {
    const type = normalizeType(params.type);

    const fromCurrency = normalizeCurrency(
        params.from,
        "origen"
    );

    const toCurrency = normalizeCurrency(
        params.to,
        "destino"
    );

    if (fromCurrency === toCurrency) {
        throw new QuoteError(
            "VALIDATION_ERROR",
            "Las monedas de origen y destino deben ser diferentes"
        );
    }

    const amount = normalizeAmount(params.amount);

    const ratesResponse = await getRates(fromCurrency);

    const rateItem = ratesResponse.rates.find(
        (rate) => rate.target === toCurrency
    );

    if (!rateItem) {
        throw new QuoteError(
            "RATES_UNAVAILABLE",
            `No se encontró una tasa para ${fromCurrency} → ${toCurrency}`
        );
    }

    const midRate = rateItem.rate;

    /**
     * Exchange:
     * amount representa lo que sale de la moneda origen.
     * No aplica spread ni comisión.
     */
    if (type === "exchange") {
        const toAmount = multiplyDecimalStrings(
            amount,
            midRate
        );

        return {
            type,
            fromCurrency,
            toCurrency,
            fromAmount: amount,
            toAmount,
            midRate,
            appliedRate: midRate,
            fee: "0",
            feeSide: "none",
            rateFetchedAt: rateItem.fetchedAt,
            rateStale: rateItem.stale,
        };
    }

    /**
     * Sell:
     * amount representa lo que el usuario vende en la moneda de origen.
     * Se aplica el spread y recibe menos en la moneda destino.
     */
    if (type === "sell") {
        const spread = SELL_SPREAD_PERCENT.toString();

        const spreadMultiplier = subtractDecimalStrings(
            "1",
            spread
        );

        const appliedRate = multiplyDecimalStrings(
            midRate,
            spreadMultiplier
        );

        const grossToAmount = multiplyDecimalStrings(
            amount,
            midRate
        );

        const toAmount = multiplyDecimalStrings(
            amount,
            appliedRate
        );

        const fee = subtractDecimalStrings(
            grossToAmount,
            toAmount
        );

        return {
            type,
            fromCurrency,
            toCurrency,
            fromAmount: amount,
            toAmount,
            midRate,
            appliedRate,
            fee,
            feeSide: "to",
            rateFetchedAt: rateItem.fetchedAt,
            rateStale: rateItem.stale,
        };
    }

    /**
    * Buy:
    * amount representa lo que el usuario quiere recibir
    * en la moneda destino.
    * Se aplica el spread y el usuario paga más en la moneda origen.
    */
    if (type === "buy") {
        const spread = BUY_SPREAD_PERCENT.toString();

        const spreadMultiplier = subtractDecimalStrings(
            "1",
            spread
        );

        const appliedRate = multiplyDecimalStrings(
            midRate,
            spreadMultiplier
        );

        const fromAmount = divideDecimalStrings(
            amount,
            appliedRate
        );

        const grossFromAmount = divideDecimalStrings(
            amount,
            midRate
        );

        const fee = subtractDecimalStrings(
            fromAmount,
            grossFromAmount
        );

        return {
            type,
            fromCurrency,
            toCurrency,
            fromAmount,
            toAmount: amount,
            midRate,
            appliedRate,
            fee,
            feeSide: "from",
            rateFetchedAt: rateItem.fetchedAt,
            rateStale: rateItem.stale,
        };
    }

    throw new QuoteError(
        "INVALID_QUOTE_TYPE",
        "No se pudo determinar el tipo de cotización"
    );
}

export { QuoteError };

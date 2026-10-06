import { pool } from "../config/database";

const CACHE_TTL_MINUTES = 60;
const CACHE_SOURCE = "exchangerate-api";

const SUPPORTED_CURRENCIES = ["USD", "EUR", "ARS"] as const;

type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

interface ExchangeRateApiResponse {
    result: string;
    conversion_rates?: Record<string, number>;
}

interface CachedRateRow {
    currency_to: string;
    rate: string;
    source: string;
    fetched_at: Date;
    valid_until: Date;
}

export interface RateItem {
    target: SupportedCurrency;
    rate: string;
    fetchedAt: Date;
    source: string;
    stale: boolean;
}

export interface RatesResponse {
    base: SupportedCurrency;
    rates: RateItem[];
}

function isSupportedCurrency(
    currency: string
): currency is SupportedCurrency {
    return SUPPORTED_CURRENCIES.includes(
        currency as SupportedCurrency
    );
}

function getTargetCurrencies(
    base: SupportedCurrency
): SupportedCurrency[] {
    return SUPPORTED_CURRENCIES.filter(
        (currency) => currency !== base
    );
}

function getValidUntil(date: Date): Date {
    return new Date(
        date.getTime() + CACHE_TTL_MINUTES * 60 * 1000
    );
}

async function getValidCachedRates(
    base: SupportedCurrency
): Promise<CachedRateRow[]> {
    const result = await pool.query<CachedRateRow>(
        `
        SELECT DISTINCT ON (currency_to)
            currency_to,
            rate,
            source,
            fetched_at,
            valid_until
        FROM exchange_rates_cache
        WHERE currency_from = $1
          AND currency_to <> $1
          AND valid_until > NOW()
        ORDER BY currency_to, fetched_at DESC
        `,
        [base]
    );

    return result.rows;
}

async function getLatestCachedRates(
    base: SupportedCurrency
): Promise<CachedRateRow[]> {
    const result = await pool.query<CachedRateRow>(
        `
        SELECT DISTINCT ON (currency_to)
            currency_to,
            rate,
            source,
            fetched_at,
            valid_until
        FROM exchange_rates_cache
        WHERE currency_from = $1
          AND currency_to <> $1
        ORDER BY currency_to, fetched_at DESC
        `,
        [base]
    );

    return result.rows;
}

async function fetchRatesFromApi(
    base: SupportedCurrency
): Promise<RatesResponse> {
    const apiKey = process.env.EXCHANGE_RATE_API_KEY;

    if (!apiKey) {
        throw new Error(
            "EXCHANGE_RATE_API_KEY no está configurada"
        );
    }

    const response = await fetch(
        `https://v6.exchangerate-api.com/v6/${apiKey}/latest/${base}`
    );

    if (!response.ok) {
        throw new Error(
            `ExchangeRate-API respondió con status ${response.status}`
        );
    }

    const data =
        (await response.json()) as ExchangeRateApiResponse;

    if (
        data.result !== "success" ||
        !data.conversion_rates
    ) {
        throw new Error(
            "Respuesta inválida de ExchangeRate-API"
        );
    }

    const fetchedAt = new Date();
    const validUntil = getValidUntil(fetchedAt);
    const targets = getTargetCurrencies(base);

    const rates: RateItem[] = [];

    for (const target of targets) {
        const rate = data.conversion_rates[target];

        if (typeof rate !== "number" || rate <= 0) {
            throw new Error(
                `No se encontró una tasa válida para ${base} → ${target}`
            );
        }

        await pool.query(
            `
            INSERT INTO exchange_rates_cache (
                currency_from,
                currency_to,
                rate,
                source,
                fetched_at,
                valid_until
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            `,
            [
                base,
                target,
                rate,
                CACHE_SOURCE,
                fetchedAt,
                validUntil,
            ]
        );

        rates.push({
            target,
            rate: rate.toString(),
            fetchedAt,
            source: CACHE_SOURCE,
            stale: false,
        });
    }

    return {
        base,
        rates,
    };
}

function mapCachedRates(
    rows: CachedRateRow[],
    stale: boolean
): RatesResponse["rates"] {
    return rows
        .filter(isCachedCurrency)
        .map((row) => ({
            target: row.currency_to,
            rate: row.rate,
            fetchedAt: row.fetched_at,
            source: row.source,
            stale,
        }));
}

function isCachedCurrency(
    row: CachedRateRow
): row is CachedRateRow & {
    currency_to: SupportedCurrency;
} {
    return isSupportedCurrency(row.currency_to);
}

export async function getRates(
    base: string = "USD"
): Promise<RatesResponse> {
    const normalizedBase = base.toUpperCase();

    if (!isSupportedCurrency(normalizedBase)) {
        throw new Error(
            `Moneda base no soportada: ${base}`
        );
    }

    const targets = getTargetCurrencies(normalizedBase);

    const cachedRates =
        await getValidCachedRates(normalizedBase);

    const hasAllCachedRates = targets.every((target) =>
        cachedRates.some(
            (row) => row.currency_to === target
        )
    );

    if (hasAllCachedRates) {
        return {
            base: normalizedBase,
            rates: mapCachedRates(cachedRates, false),
        };
    }

    try {
        return await fetchRatesFromApi(normalizedBase);
    } catch (error) {
        console.error(
            "ExchangeRate-API error:",
            error
        );

        const latestRates =
            await getLatestCachedRates(normalizedBase);

        const hasFallbackRates = targets.every((target) =>
            latestRates.some(
                (row) => row.currency_to === target
            )
        );

        if (hasFallbackRates) {
            return {
                base: normalizedBase,
                rates: mapCachedRates(latestRates, true),
            };
        }

        throw error;
    }
}
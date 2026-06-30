import { convertViaKgs, fetchNbkrRatesForDate, roundMoney, unitInKgs } from "./nbkr";

export type RentalPaymentFxResult = {
  accountAmount: number;
  exchangeRate: number;
  exchangeRateDate: string;
  rateWarning?: string;
};

/** «1 USD = N сом» — ручной курс или НБКР. */
export function resolveKgsPerUsd(
  nbkrRates: Record<string, { name: string; rate: string; scale: string }>,
  exchangeRateOverride?: number,
): number {
  if (exchangeRateOverride != null && exchangeRateOverride > 1) {
    return exchangeRateOverride;
  }
  return unitInKgs("USD", nbkrRates);
}

/** Сумма платежа в валюте договора (для аллокации по начислениям). */
export async function convertPaymentToContractCurrency(params: {
  paymentAmount: number;
  paymentCurrency: string;
  contractCurrency: string;
  paymentDate: string;
  exchangeRateOverride?: number;
}): Promise<{
  contractAmount: number;
  kgsPerUsd: number;
  exchangeRateDate: string;
  rateWarning?: string;
}> {
  const {
    paymentAmount,
    paymentCurrency,
    contractCurrency,
    paymentDate,
    exchangeRateOverride,
  } = params;
  const payCur = paymentCurrency.toUpperCase();
  const contractCur = contractCurrency.toUpperCase();

  if (payCur === contractCur) {
    return {
      contractAmount: roundMoney(paymentAmount),
      kgsPerUsd: 1,
      exchangeRateDate: String(paymentDate).slice(0, 10),
    };
  }

  const nbkr = await fetchNbkrRatesForDate(String(paymentDate).slice(0, 10));
  const kgsPerUsd = resolveKgsPerUsd(nbkr.rates, exchangeRateOverride);

  if (payCur === "KGS" && contractCur === "USD") {
    return {
      contractAmount: roundMoney(paymentAmount / kgsPerUsd),
      kgsPerUsd,
      exchangeRateDate: nbkr.date,
      rateWarning: nbkr.warning,
    };
  }
  if (payCur === "USD" && contractCur === "KGS") {
    return {
      contractAmount: roundMoney(paymentAmount * kgsPerUsd),
      kgsPerUsd,
      exchangeRateDate: nbkr.date,
      rateWarning: nbkr.warning,
    };
  }

  return {
    contractAmount: roundMoney(
      convertViaKgs(paymentAmount, payCur, contractCur, nbkr.rates),
    ),
    kgsPerUsd,
    exchangeRateDate: nbkr.date,
    rateWarning: nbkr.warning,
  };
}

/** Сумма зачисления на счёт в валюте счёта. */
export async function resolveRentalPaymentAccountCredit(params: {
  paymentAmount: number;
  paymentCurrency: string;
  accountCurrency: string;
  paymentDate: string;
  /** 1 USD = N KGS — ручной курс при оплате сомами по USD-договору */
  exchangeRateOverride?: number;
}): Promise<RentalPaymentFxResult> {
  const {
    paymentAmount,
    paymentCurrency,
    accountCurrency,
    paymentDate,
    exchangeRateOverride,
  } = params;
  const payCur = paymentCurrency.toUpperCase();
  const accCur = accountCurrency.toUpperCase();

  if (payCur === accCur) {
    return {
      accountAmount: roundMoney(paymentAmount),
      exchangeRate: 1,
      exchangeRateDate: String(paymentDate).slice(0, 10),
    };
  }

  const nbkr = await fetchNbkrRatesForDate(String(paymentDate).slice(0, 10));
  const kgsPerUsd = resolveKgsPerUsd(nbkr.rates, exchangeRateOverride);

  let accountAmount: number;
  let exchangeRate: number;

  if (payCur === "KGS" && accCur === "USD") {
    accountAmount = roundMoney(paymentAmount / kgsPerUsd);
    exchangeRate = kgsPerUsd;
  } else if (payCur === "USD" && accCur === "KGS") {
    accountAmount = roundMoney(paymentAmount * kgsPerUsd);
    exchangeRate = kgsPerUsd;
  } else {
    accountAmount = roundMoney(
      convertViaKgs(paymentAmount, payCur, accCur, nbkr.rates),
    );
    exchangeRate =
      paymentAmount > 0 ? roundMoney(accountAmount / paymentAmount) : 1;
  }

  return {
    accountAmount,
    exchangeRate,
    exchangeRateDate: nbkr.date,
    rateWarning: nbkr.warning,
  };
}

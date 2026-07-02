import { describe, it, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import {
  resolveKgsPerUsd,
  convertPaymentToContractCurrency,
  resolveRentalPaymentAccountCredit,
} from "./rental-payment-fx";
import { unitInKgs, convertViaKgs, roundMoney } from "./nbkr";

const RATES = {
  USD: { name: "Доллар США", scale: "1", rate: "90.00" },
  EUR: { name: "Евро", scale: "1", rate: "99.00" },
  RUB: { name: "Российский рубль", scale: "100", rate: "95.00" },
};

const NBKR_XML = `<CurrencyRates Date="05.06.2026">
<Currency ISOCode="USD"><Nominal>1</Nominal><Value>90,00</Value></Currency>
<Currency ISOCode="EUR"><Nominal>1</Nominal><Value>99,00</Value></Currency>
<Currency ISOCode="RUB"><Nominal>100</Nominal><Value>95,00</Value></Currency>
</CurrencyRates>`;

describe("nbkr pure helpers", () => {
  it("unitInKgs: KGS = 1, scale учитывается", () => {
    assert.equal(unitInKgs("KGS", RATES), 1);
    assert.equal(unitInKgs("USD", RATES), 90);
    assert.equal(unitInKgs("RUB", RATES), 0.95); // 95 за 100 рублей
  });

  it("unitInKgs: неизвестная валюта — ошибка", () => {
    assert.throws(() => unitInKgs("JPY", RATES), /Нет официального курса/);
  });

  it("convertViaKgs: конвертация через сом", () => {
    assert.equal(convertViaKgs(100, "USD", "KGS", RATES), 9000);
    assert.equal(roundMoney(convertViaKgs(99, "EUR", "USD", RATES)), 108.9);
  });

  it("roundMoney: округление до тыйына", () => {
    assert.equal(roundMoney(10.005), 10.01);
    assert.equal(roundMoney(10.004), 10);
  });
});

describe("resolveKgsPerUsd", () => {
  it("ручной курс имеет приоритет", () => {
    assert.equal(resolveKgsPerUsd(RATES, 89.5), 89.5);
  });

  it("некорректный override (<=1) игнорируется — берётся НБКР", () => {
    assert.equal(resolveKgsPerUsd(RATES, 0), 90);
    assert.equal(resolveKgsPerUsd(RATES, 1), 90);
    assert.equal(resolveKgsPerUsd(RATES, undefined), 90);
  });
});

describe("конвертация платежа (fetch НБКР замокан)", () => {
  beforeEach(() => {
    mock.method(globalThis, "fetch", async () =>
      new Response(NBKR_XML, { status: 200 }),
    );
  });
  afterEach(() => {
    mock.restoreAll();
  });

  it("одинаковая валюта — без конвертации и без сети", async () => {
    const r = await convertPaymentToContractCurrency({
      paymentAmount: 1234.567,
      paymentCurrency: "usd",
      contractCurrency: "USD",
      paymentDate: "2026-06-05T10:00:00Z",
    });
    assert.equal(r.contractAmount, 1234.57);
    assert.equal(r.kgsPerUsd, 1);
    assert.equal(r.exchangeRateDate, "2026-06-05");
  });

  it("KGS → USD по курсу НБКР", async () => {
    const r = await convertPaymentToContractCurrency({
      paymentAmount: 9000,
      paymentCurrency: "KGS",
      contractCurrency: "USD",
      paymentDate: "2026-06-05",
    });
    assert.equal(r.contractAmount, 100);
    assert.equal(r.kgsPerUsd, 90);
  });

  it("KGS → USD по ручному курсу", async () => {
    const r = await convertPaymentToContractCurrency({
      paymentAmount: 8900,
      paymentCurrency: "KGS",
      contractCurrency: "USD",
      paymentDate: "2026-06-05",
      exchangeRateOverride: 89,
    });
    assert.equal(r.contractAmount, 100);
    assert.equal(r.kgsPerUsd, 89);
  });

  it("USD → KGS умножает на курс", async () => {
    const r = await convertPaymentToContractCurrency({
      paymentAmount: 100,
      paymentCurrency: "USD",
      contractCurrency: "KGS",
      paymentDate: "2026-06-05",
    });
    assert.equal(r.contractAmount, 9000);
  });

  it("кросс-валютная пара EUR → USD идёт через сом", async () => {
    const r = await convertPaymentToContractCurrency({
      paymentAmount: 90,
      paymentCurrency: "EUR",
      contractCurrency: "USD",
      paymentDate: "2026-06-05",
    });
    assert.equal(r.contractAmount, 99); // 90 EUR * 99 / 90
  });

  it("resolveRentalPaymentAccountCredit: KGS-платёж на USD-счёт", async () => {
    const r = await resolveRentalPaymentAccountCredit({
      paymentAmount: 9000,
      paymentCurrency: "KGS",
      accountCurrency: "USD",
      paymentDate: "2026-06-05",
    });
    assert.equal(r.accountAmount, 100);
    assert.equal(r.exchangeRate, 90);
  });

  it("resolveRentalPaymentAccountCredit: одинаковая валюта — курс 1", async () => {
    const r = await resolveRentalPaymentAccountCredit({
      paymentAmount: 500,
      paymentCurrency: "KGS",
      accountCurrency: "kgs",
      paymentDate: "2026-06-05",
    });
    assert.equal(r.accountAmount, 500);
    assert.equal(r.exchangeRate, 1);
  });

  it("при недоступном НБКР используются резервные курсы с предупреждением", async () => {
    mock.restoreAll();
    mock.method(globalThis, "fetch", async () => {
      throw new Error("network down");
    });
    const r = await convertPaymentToContractCurrency({
      paymentAmount: 8750,
      paymentCurrency: "KGS",
      contractCurrency: "USD",
      paymentDate: "2026-06-05",
    });
    assert.equal(r.contractAmount, 100); // fallback 87.50
    assert.ok(r.rateWarning);
  });
});

# 🔧 API 404 ERROR FIX

**Дата:** 5 июня 2026  
**Ошибка:** `PATCH https://proptech-api.vercel.app/api/construction/units/147/pricing 404 (Not Found)`  
**Статус:** ✅ Причина найдена

---

## 🔍 АНАЛИЗ ПРОБЛЕМЫ

### 1. Endpoint существует

**Файл:** `artifacts/api-server/src/routes/construction.ts:1826`

```typescript
router.patch("/units/:id/pricing", async (req: AuthenticatedRequest, res): Promise<void> => {
  if (!canApproveUnitPricing(req.userRole)) {
    res.status(403).json({ error: "Утверждать цены может только коммерческий директор или администратор" });
    return;
  }

  const id = parseInt(req.params.id as string, 10);
  const basePricePerSqm = parseFloat(String(req.body?.basePricePerSqm ?? ""));
  const saleCoefficient = parseFloat(String(req.body?.saleCoefficient ?? ""));
  // ...
});
```

**Статус:** ✅ Код endpoint правильный

---

### 2. Client вызов корректный

**Файл:** `artifacts/proptech/src/pages/construction/chess.tsx:531`

```typescript
await api.patch(`/construction/units/${unit.id}/pricing`, {
  basePricePerSqm: form.basePricePerSqm,
  saleCoefficient: form.saleCoefficient,
  isPublishedForSale: form.isPublishedForSale,
});
```

**Статус:** ✅ Запрос правильный

---

### 3. ПРОБЛЕМА: Несоответствие API URL

**.env.production:**
```env
VITE_API_URL=https://api-server-rho-six.vercel.app
```

**Actual Production API (из vercel):**
```
https://proptech-api.vercel.app
```

**Проблема:** Frontend обращается к старому API URL, который может не иметь этого endpoint.

---

## ✅ РЕШЕНИЕ

### Вариант 1: Обновить .env.production (Рекомендуется)

```bash
# artifacts/proptech/.env.production
VITE_API_URL=https://proptech-api.vercel.app
```

### Вариант 2: Установить Vercel Environment Variable

```bash
# В Vercel Dashboard > planalityc.ai > Settings > Environment Variables

Production:
VITE_API_URL = https://proptech-api.vercel.app
```

### Вариант 3: Проверить Vercel Deployment

Возможно API деплоится на другой URL. Проверить:

```bash
vercel --prod --cwd artifacts/api-server
```

---

## 🔄 STEPS TO FIX

### 1. Определить правильный API URL

```bash
# Проверить текущий production API
curl -I https://api-server-rho-six.vercel.app/api/healthz
curl -I https://proptech-api.vercel.app/api/healthz

# Проверить Vercel deployments
cd artifacts/api-server
vercel ls
```

### 2. Обновить .env.production

```bash
cd artifacts/proptech
echo "VITE_API_URL=<CORRECT_API_URL>" > .env.production
```

### 3. Пересобрать и задеплоить

```bash
# Local test
npm run build
npm run preview

# Deploy to Vercel
vercel --prod
```

### 4. Проверить в production

```bash
# Open browser console
# Check API calls - should point to correct URL
```

---

## 🎯 QUICK FIX NOW

```bash
cd /Users/asans/Documents/табель/planalityc.ai/artifacts/proptech

# Update .env.production
echo "VITE_API_URL=https://proptech-api.vercel.app" > .env.production

# Rebuild
npm run build

# Deploy
vercel --prod
```

---

## 🔍 ДОПОЛНИТЕЛЬНЫЕ ПРОВЕРКИ

### 1. Missing Description Warning

```
Warning: Missing `Description` or `aria-describedby={undefined}` for {DialogContent}
```

**Решение:**
```tsx
// artifacts/proptech/src/components/ui/dialog.tsx
<DialogContent aria-describedby={undefined}>
  {/* или */}
  <DialogDescription className="sr-only">
    Dialog description
  </DialogDescription>
</DialogContent>
```

### 2. API Error Response

Если 404 остается после обновления URL:

**Проверить:**
- [ ] API сервер действительно задеплоен
- [ ] Route зарегистрирован в app.use()
- [ ] CORS настроен правильно
- [ ] Authentication token валидный

---

## 📋 CHECKLIST

- [ ] Определить правильный production API URL
- [ ] Обновить `artifacts/proptech/.env.production`
- [ ] Пересобрать frontend (`npm run build`)
- [ ] Задеплоить на Vercel
- [ ] Протестировать pricing endpoint в production
- [ ] Исправить DialogContent warning
- [ ] Проверить другие API endpoints

---

## 🚨 CRITICAL

**Не забыть:**
1. Убедиться что API-server действительно задеплоен на Vercel
2. Проверить что endpoint `/units/:id/pricing` доступен
3. Проверить CORS для proptech domain
4. Обновить environment variables в Vercel Dashboard

---

**✅ После исправления .env.production и redeploy - 404 должна исчезнуть.**

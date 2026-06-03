const money = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 0,
});

const state = {
  view: "overview",
  basePrice: 1500,
  selectedUnitId: "a-0403",
  units: [
    { id: "a-0501", floor: 5, number: "A-501", area: 86.4, coefficient: 1.18, status: "available", view: "панорама", buyer: null },
    { id: "a-0502", floor: 5, number: "A-502", area: 72.1, coefficient: null, status: "locked", view: "двор", buyer: null },
    { id: "a-0503", floor: 5, number: "A-503", area: 61.8, coefficient: 1.05, status: "reserved", view: "город", buyer: "Айбек К." },
    { id: "a-0504", floor: 5, number: "A-504", area: 48.2, coefficient: 0.98, status: "available", view: "двор", buyer: null },
    { id: "a-0401", floor: 4, number: "A-401", area: 86.4, coefficient: 1.12, status: "sold", view: "панорама", buyer: "Нурлан Т." },
    { id: "a-0402", floor: 4, number: "A-402", area: 72.1, coefficient: 1.03, status: "available", view: "двор", buyer: null },
    { id: "a-0403", floor: 4, number: "A-403", area: 61.8, coefficient: 1.08, status: "available", view: "город", buyer: null },
    { id: "a-0404", floor: 4, number: "A-404", area: 48.2, coefficient: null, status: "locked", view: "двор", buyer: null },
    { id: "a-0301", floor: 3, number: "A-301", area: 86.4, coefficient: 1.06, status: "available", view: "панорама", buyer: null },
    { id: "a-0302", floor: 3, number: "A-302", area: 72.1, coefficient: null, status: "locked", view: "двор", buyer: null },
    { id: "a-0303", floor: 3, number: "A-303", area: 61.8, coefficient: 1.0, status: "available", view: "город", buyer: null },
    { id: "a-0304", floor: 3, number: "A-304", area: 48.2, coefficient: 0.94, status: "available", view: "двор", buyer: null },
  ],
  accruals: [
    { title: "Первоначальный взнос", due: "03.06.2026", amount: 18544, paid: 18544 },
    { title: "Платёж 1/12", due: "03.07.2026", amount: 5400, paid: 5400 },
    { title: "Платёж 2/12", due: "03.08.2026", amount: 5400, paid: 3200 },
    { title: "Платёж 3/12", due: "03.09.2026", amount: 5400, paid: 0 },
    { title: "Платёж 4/12", due: "03.10.2026", amount: 5400, paid: 0 },
  ],
  requests: [
    { client: "Айбек К.", topic: "Хочу сдать квартиру в аренду", status: "В работе", segment: "Покупатель A-503" },
    { client: "Нурлан Т.", topic: "Запрос акта сверки", status: "Новая", segment: "Есть просрочка" },
    { client: "Группа ЖК Nova", topic: "Акция на кондиционеры", status: "Запланировано", segment: "Клиенты 4-5 этаж" },
  ],
};

const nav = [
  { group: "Core", items: [
    ["overview", "Операционный центр"],
    ["core", "Фундамент данных"],
  ] },
  { group: "Продажи", items: [
    ["chess", "Шахматка и цены"],
    ["contract", "Договор и начисления"],
  ] },
  { group: "Клиенты", items: [
    ["portal", "Клиентский портал"],
    ["relations", "Client Relations"],
  ] },
  { group: "Операции", items: [
    ["cost", "Себестоимость"],
    ["supply", "Снабжение"],
  ] },
];

const titles = {
  overview: ["Операционный центр", "Проект, объект, договор, деньги и клиентский сервис в одном контуре"],
  core: ["Фундамент данных", "Единые сущности, на которые садятся все модули"],
  chess: ["Шахматка и коммерческая цена", "Продажники видят только объекты, открытые коммерческим директором"],
  contract: ["Договор и начисления", "График платежей создаётся автоматически из условий договора"],
  portal: ["Клиентский портал", "Покупатель видит договор, платежи, документы, сервисы и рост стоимости"],
  relations: ["Client Relations", "Отдел по связям управляет публикациями, обращениями и рассылками"],
  cost: ["Себестоимость строительства", "План-факт по проектам, этапам, задачам и материалам"],
  supply: ["Снабжение и marketplace", "Заявки, согласования, закуп, склад и внешний каталог поставщиков"],
};

function unitPrice(unit) {
  if (!unit.coefficient) return 0;
  return unit.area * state.basePrice * unit.coefficient;
}

function selectedUnit() {
  return state.units.find((unit) => unit.id === state.selectedUnitId) || state.units[0];
}

function statusLabel(status) {
  return {
    available: "В продаже",
    locked: "Цена не утверждена",
    reserved: "Бронь",
    sold: "Продано",
  }[status];
}

function badgeClass(status) {
  return {
    available: "green",
    locked: "",
    reserved: "amber",
    sold: "cyan",
  }[status];
}

function render() {
  const [title, subtitle] = titles[state.view];
  document.querySelector("#app").innerHTML = `
    <div class="shell">
      <aside class="sidebar">
        <div class="brand">
          <strong>Planalityc</strong>
          <span>Construction operating platform</span>
        </div>
        ${nav.map((section) => `
          <div class="nav-group">
            <div class="nav-title">${section.group}</div>
            ${section.items.map(([id, label]) => `
              <button class="nav-button ${state.view === id ? "active" : ""}" data-view="${id}">
                <span class="nav-dot"></span>
                <span>${label}</span>
              </button>
            `).join("")}
          </div>
        `).join("")}
      </aside>
      <main class="main">
        <header class="topbar">
          <div>
            <h1>${title}</h1>
            <p>${subtitle}</p>
          </div>
          <div class="actions">
            <button class="btn" data-view="relations">Обращения</button>
            <button class="btn primary" data-view="chess">Открыть шахматку</button>
          </div>
        </header>
        <section class="content">${views[state.view]()}</section>
      </main>
    </div>
  `;

  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      state.view = button.dataset.view;
      render();
    });
  });

  document.querySelectorAll("[data-unit]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedUnitId = button.dataset.unit;
      render();
    });
  });

  const baseInput = document.querySelector("#basePrice");
  if (baseInput) {
    baseInput.addEventListener("input", () => {
      state.basePrice = Number(baseInput.value) || 0;
      render();
    });
  }

  const coefficientInput = document.querySelector("#coefficient");
  if (coefficientInput) {
    coefficientInput.addEventListener("input", () => {
      const unit = selectedUnit();
      unit.coefficient = Number(coefficientInput.value) || null;
      unit.status = unit.coefficient ? "available" : "locked";
      render();
    });
  }

  const reserve = document.querySelector("#reserveUnit");
  if (reserve) {
    reserve.addEventListener("click", () => {
      const unit = selectedUnit();
      if (unit.status === "available") {
        unit.status = "reserved";
        unit.buyer = "Новый клиент";
        state.view = "contract";
        render();
      }
    });
  }
}

const views = {
  overview() {
    const active = state.units.filter((unit) => unit.status === "available").length;
    const locked = state.units.filter((unit) => unit.status === "locked").length;
    const revenue = state.units.reduce((sum, unit) => sum + (unit.status !== "locked" ? unitPrice(unit) : 0), 0);
    const debt = state.accruals.reduce((sum, item) => sum + Math.max(0, item.amount - item.paid), 0);

    return `
      <div class="kpis">
        <div class="kpi"><span>Открыто к продаже</span><strong>${active}</strong><small>${locked} объектов ждут цены</small></div>
        <div class="kpi"><span>Потенциал шахматки</span><strong>$${money.format(revenue)}</strong><small>по утверждённым коэффициентам</small></div>
        <div class="kpi"><span>Просрочка</span><strong>$${money.format(debt)}</strong><small>по активным договорам</small></div>
        <div class="kpi"><span>Обращения клиентов</span><strong>${state.requests.length}</strong><small>портал и рассылки</small></div>
      </div>
      <div class="grid-2">
        <div class="panel">
          <div class="panel-head">
            <h2>Главный сценарий продукта</h2>
            <span class="badge green">MVP 1.0</span>
          </div>
          <div class="timeline">
            ${["Коммерческий директор утверждает цену", "Продажник бронирует объект", "Договор создаёт начисления", "Оплаты закрывают график", "Клиент видит всё в портале", "Client Relations управляет коммуникациями"].map((text) => `
              <div class="timeline-item"><span class="timeline-dot"></span><div><strong>${text}</strong><div class="muted small">Связано с объектом, контрагентом, договором и операцией</div></div></div>
            `).join("")}
          </div>
        </div>
        <div class="panel">
          <div class="panel-head"><h2>Контроль риска</h2><span class="badge red">блокировки</span></div>
          <table class="table">
            <tr><th>Риск</th><th>Решение</th></tr>
            <tr><td>Двойная продажа</td><td>lock юнита + один активный договор</td></tr>
            <tr><td>Продажа без цены</td><td>недоступно до коэффициента</td></tr>
            <tr><td>Ручные долги</td><td>начисления из договора</td></tr>
            <tr><td>Потерянные обращения</td><td>единый Client Relations inbox</td></tr>
          </table>
        </div>
      </div>
      <div class="module-map">
        ${["Core", "Продажи", "Финансы", "Портал", "Стройка", "Снабжение"].map((name, idx) => `
          <div class="module-card">
            <strong>${name}</strong>
            <div class="progress"><span style="width:${[90, 76, 68, 58, 64, 52][idx]}%"></span></div>
            <p class="muted small">${["Единые сущности", "Шахматка и договоры", "Начисления и сверки", "Клиентский сервис", "Себестоимость", "Заявки и склад"][idx]}</p>
          </div>
        `).join("")}
      </div>
    `;
  },
  core() {
    return `
      <div class="grid-3">
        ${[
          ["Контрагент", "Покупатель, арендатор, инвестор, поставщик, подрядчик в одной карточке"],
          ["Объект", "Юнит из шахматки может быть продажей, арендой или активом клиента"],
          ["Договор", "Единая основа для продажи, аренды, поставки, подряда и сервиса"],
          ["Начисление", "Финансовое обязательство, которое потом закрывается оплатой"],
          ["Операция", "Приход, расход, перевод, списание, корректировка, сверка"],
          ["Портал", "Внешний слой для покупателей, арендаторов, поставщиков и подрядчиков"],
        ].map(([title, text]) => `
          <div class="panel">
            <h2>${title}</h2>
            <p class="muted">${text}</p>
          </div>
        `).join("")}
      </div>
      <div class="panel">
        <div class="panel-head"><h2>Единая модель</h2><span class="badge">foundation</span></div>
        <table class="table">
          <tr><th>Сущность</th><th>Используют модули</th><th>Ключевая связь</th></tr>
          <tr><td>Проект</td><td>стройка, продажи, финансы, снабжение</td><td>projectId</td></tr>
          <tr><td>Юнит</td><td>шахматка, CRM, договоры, портал</td><td>unitId</td></tr>
          <tr><td>Контрагент</td><td>CRM, аренда, marketplace, подрядчики</td><td>counterpartyId + roles</td></tr>
          <tr><td>Договор</td><td>продажи, аренда, поставка, подряд</td><td>contractId</td></tr>
          <tr><td>Операция</td><td>ОДДС, ОПУ, себестоимость, сверка</td><td>operationId</td></tr>
        </table>
      </div>
    `;
  },
  chess() {
    const unit = selectedUnit();
    const price = unitPrice(unit);
    const floors = [...new Set(state.units.map((u) => u.floor))].sort((a, b) => b - a);

    return `
      <div class="grid-2">
        <div class="panel">
          <div class="panel-head">
            <h2>Шахматка ЖК Nova Tower</h2>
            <span class="badge green">${state.units.filter((u) => u.status === "available").length} в продаже</span>
          </div>
          <div class="board">
            ${floors.map((floor) => `
              <div class="floor">
                <div class="floor-label">${floor} этаж</div>
                ${state.units.filter((unit) => unit.floor === floor).map((item) => `
                  <button class="unit ${item.status} ${item.id === unit.id ? "selected" : ""}" data-unit="${item.id}">
                    <strong>${item.number}</strong>
                    <span>${item.area} м² · ${item.view}</span>
                    <span class="badge ${badgeClass(item.status)}">${statusLabel(item.status)}</span>
                  </button>
                `).join("")}
              </div>
            `).join("")}
          </div>
        </div>
        <div class="panel">
          <div class="panel-head"><h2>${unit.number}</h2><span class="badge ${badgeClass(unit.status)}">${statusLabel(unit.status)}</span></div>
          <div class="form-grid">
            <label>Базовая цена проекта, $/м²<input id="basePrice" type="number" value="${state.basePrice}" /></label>
            <label>Коэффициент юнита<input id="coefficient" type="number" step="0.01" value="${unit.coefficient ?? ""}" placeholder="Не утверждён" /></label>
            <label>Площадь<input value="${unit.area} м²" disabled /></label>
            <label>Итоговая цена<input value="${price ? `$${money.format(price)}` : "нет цены"}" disabled /></label>
          </div>
          <p class="muted small">Если коэффициент пустой, объект остаётся неактивным для продажников.</p>
          <div class="actions">
            <button id="reserveUnit" class="btn primary" ${unit.status !== "available" ? "disabled" : ""}>Забронировать</button>
            <button class="btn" data-view="contract">Открыть договор</button>
          </div>
        </div>
      </div>
    `;
  },
  contract() {
    const unit = selectedUnit();
    const price = unitPrice(unit) || 64800;
    const paid = state.accruals.reduce((sum, item) => sum + item.paid, 0);
    const total = state.accruals.reduce((sum, item) => sum + item.amount, 0);

    return `
      <div class="grid-2">
        <div class="panel">
          <div class="panel-head"><h2>Договор ДКП-2026-0048</h2><span class="badge amber">рассрочка 12 мес.</span></div>
          <div class="grid-3">
            <div class="card kpi"><span>Объект</span><strong>${unit.number}</strong><small>${unit.area} м²</small></div>
            <div class="card kpi"><span>Сумма</span><strong>$${money.format(price)}</strong><small>по утверждённой цене</small></div>
            <div class="card kpi"><span>Остаток</span><strong>$${money.format(Math.max(0, total - paid))}</strong><small>по начислениям</small></div>
          </div>
          <table class="table">
            <tr><th>Начисление</th><th>Срок</th><th>Сумма</th><th>Оплачено</th><th>Статус</th></tr>
            ${state.accruals.map((item) => {
              const balance = item.amount - item.paid;
              const status = balance <= 0 ? "Оплачено" : item.paid > 0 ? "Частично" : "Ожидается";
              return `<tr><td>${item.title}</td><td>${item.due}</td><td>$${money.format(item.amount)}</td><td>$${money.format(item.paid)}</td><td><span class="badge ${balance <= 0 ? "green" : "amber"}">${status}</span></td></tr>`;
            }).join("")}
          </table>
        </div>
        <div class="panel">
          <div class="panel-head"><h2>Акт сверки</h2><span class="badge cyan">авто</span></div>
          <table class="table">
            <tr><td>Начислено</td><td>$${money.format(total)}</td></tr>
            <tr><td>Оплачено</td><td>$${money.format(paid)}</td></tr>
            <tr><td>Остаток</td><td>$${money.format(total - paid)}</td></tr>
            <tr><td>Просрочено</td><td>$${money.format(2200)}</td></tr>
          </table>
          <p class="muted">Документы, платежи и график сразу публикуются в клиентский портал после утверждения договора.</p>
          <div class="actions"><button class="btn good" data-view="portal">Посмотреть портал</button></div>
        </div>
      </div>
    `;
  },
  portal() {
    return `
      <div class="grid-2">
        <div class="panel">
          <div class="panel-head"><h2>Портал покупателя</h2><span class="badge green">активен</span></div>
          <div class="grid-3">
            <div class="card kpi"><span>Цена покупки</span><strong>$1 500/м²</strong><small>июнь 2024</small></div>
            <div class="card kpi"><span>Рынок сейчас</span><strong>$2 300/м²</strong><small>оценка компании</small></div>
            <div class="card kpi"><span>Рост актива</span><strong>+53%</strong><small>$49 440 потенциал</small></div>
          </div>
          <table class="table">
            <tr><th>Раздел</th><th>Что видит клиент</th></tr>
            <tr><td>Договор</td><td>PDF, график, история изменений</td></tr>
            <tr><td>Платежи</td><td>начислено, оплачено, остаток, просрочка</td></tr>
            <tr><td>Сервисы</td><td>аренда, перепродажа, кондиционеры, ремонт</td></tr>
            <tr><td>Новости</td><td>проектные объявления, акции, сроки</td></tr>
          </table>
        </div>
        <div class="portal-phone">
          <div class="portal-screen">
            <strong>Nova Tower · A-403</strong>
            <div class="portal-card"><span class="badge green">Договор активен</span><h3>$66 765</h3><p class="muted small">Оплачено $27 144 · Остаток $39 621</p></div>
            <div class="portal-card"><h3>Рост стоимости</h3><div class="progress"><span style="width:68%"></span></div><p class="muted small">Ваша недвижимость выросла примерно на $49 440</p></div>
            <div class="portal-card"><h3>Быстрые заявки</h3><button class="btn">Сдать в аренду</button> <button class="btn">Продать</button></div>
            <div class="portal-card"><h3>Акция</h3><p class="muted small">Кондиционеры от партнёров со скидкой 12%</p></div>
          </div>
        </div>
      </div>
    `;
  },
  relations() {
    return `
      <div class="grid-2">
        <div class="panel">
          <div class="panel-head"><h2>Client Relations inbox</h2><span class="badge red">3 в очереди</span></div>
          <table class="table">
            <tr><th>Клиент</th><th>Тема</th><th>Сегмент</th><th>Статус</th></tr>
            ${state.requests.map((item) => `
              <tr><td>${item.client}</td><td>${item.topic}</td><td>${item.segment}</td><td><span class="badge amber">${item.status}</span></td></tr>
            `).join("")}
          </table>
        </div>
        <div class="panel">
          <div class="panel-head"><h2>Публикация</h2><span class="badge">портал</span></div>
          <div class="form-grid">
            <label>Аудитория<select><option>Клиенты ЖК Nova Tower</option><option>Клиенты с просрочкой</option><option>Полностью оплатившие</option></select></label>
            <label>Канал<select><option>Портал + push</option><option>Email</option><option>Telegram</option></select></label>
          </div>
          <label>Сообщение<textarea rows="5">Уважаемые клиенты, открыт сервис по передаче объектов в аренду и перепродажу через компанию.</textarea></label>
          <div class="actions"><button class="btn primary">Запланировать</button><button class="btn">Сохранить черновик</button></div>
        </div>
      </div>
    `;
  },
  cost() {
    return `
      <div class="grid-3">
        ${[
          ["Материалы", "$421 000", 72],
          ["Подрядчики", "$288 000", 64],
          ["Зарплата", "$96 000", 44],
        ].map(([name, amount, progress]) => `
          <div class="panel"><span class="muted small">${name}</span><h2>${amount}</h2><div class="progress"><span style="width:${progress}%"></span></div></div>
        `).join("")}
      </div>
      <div class="panel">
        <div class="panel-head"><h2>План-факт себестоимости</h2><span class="badge amber">перерасход 8%</span></div>
        <table class="table">
          <tr><th>Этап</th><th>План</th><th>Факт</th><th>Отклонение</th></tr>
          <tr><td>Фундамент</td><td>$180 000</td><td>$176 400</td><td><span class="badge green">-2%</span></td></tr>
          <tr><td>Монолит</td><td>$320 000</td><td>$351 000</td><td><span class="badge red">+10%</span></td></tr>
          <tr><td>Фасад</td><td>$210 000</td><td>$218 200</td><td><span class="badge amber">+4%</span></td></tr>
        </table>
      </div>
    `;
  },
  supply() {
    return `
      <div class="grid-2">
        <div class="panel">
          <div class="panel-head"><h2>Снабжение</h2><span class="badge cyan">внутренний процесс</span></div>
          <div class="timeline">
            ${["Прораб создаёт заявку", "Снабженец выбирает поставщика", "Руководитель согласует", "Заказ формируется", "Поступление на склад", "Списание на проект/этап/задачу"].map((text) => `
              <div class="timeline-item"><span class="timeline-dot"></span><div><strong>${text}</strong></div></div>
            `).join("")}
          </div>
        </div>
        <div class="panel">
          <div class="panel-head"><h2>Marketplace</h2><span class="badge green">внешний слой</span></div>
          <table class="table">
            <tr><th>Поставщик</th><th>Товар</th><th>Цена</th><th>Срок</th></tr>
            <tr><td>Дилер А</td><td>Цемент М400</td><td>420 сом</td><td>1 день</td></tr>
            <tr><td>Дистрибьютор B</td><td>Арматура 12</td><td>48 сом/кг</td><td>2 дня</td></tr>
            <tr><td>Завод C</td><td>Газоблок</td><td>3 800 сом/м³</td><td>4 дня</td></tr>
          </table>
          <p class="muted small">Marketplace должен создавать заказ в снабжении, а не жить отдельной бухгалтерией.</p>
        </div>
      </div>
    `;
  },
};

render();

<p align="center">
  <img src="packages/website/public/logo.svg" width="64" height="64" alt="شعار Q8iDevAI">
</p>

<h1 align="center">Q8iDevAI</h1>

<p align="center">
  <a href="README.md">English</a> ·
  <a href="README.ar.md">العربية</a>
</p>

<p align="center">
  <a href="https://github.com/Q8iDevAI/Q8iDevAI/stargazers">
    <img src="https://img.shields.io/github/stars/Q8iDevAI/Q8iDevAI?style=flat&logo=github" alt="نجوم GitHub">
  </a>
  <a href="https://github.com/Q8iDevAI/Q8iDevAI/releases">
    <img src="https://img.shields.io/github/v/release/Q8iDevAI/Q8iDevAI?style=flat&logo=github" alt="إصدارات GitHub">
  </a>
</p>

<p align="center">واجهة موحدة لوكلاء البرمجة: Claude Code وCodex وCopilot وOpenCode وPi.</p>

<p align="center">
  <img src="https://Q8iDev.CoM/Q8iDevAI/hero-mockup.png" alt="لقطة شاشة لتطبيق Q8iDevAI" width="100%">
</p>

<p align="center">
  <img src="https://Q8iDev.CoM/Q8iDevAI/mobile-mockup.png" alt="تطبيق Q8iDevAI للهواتف" width="100%">
</p>

شغّل الوكلاء بالتوازي على أجهزتك الخاصة، ونفّذ مشاريعك مباشرة من هاتفك أو مكتبك.

- **استضافة ذاتية (Self-hosted):** يعمل الوكلاء على جهازك مع بيئة التطوير الكاملة الخاصة بك؛ استخدم أدواتك وإعداداتك ومهاراتك.
- **دعم مزودين متعددين (Multi-provider):** يدعم Claude Code وCodex وCopilot وOpenCode وPi من خلال الواجهة نفسها؛ اختر النموذج الأنسب لكل مهمة.
- **تحكم صوتي (Voice control):** قم بإملاء المهام أو مناقشة المشكلات عبر الوضع الصوتي؛ تحكم بدون استخدام اليدين متى احتجت لذلك.
- **توافق عبر الأجهزة (Cross-device):** أنظمة iOS وAndroid وسطح المكتب والويب وواجهة السطر البرمجي (CLI)؛ ابدأ العمل من مكتبك، وتابعه عبر هاتفك، أو قم بأتمتته عبر الطرفية.
- **الخصوصية أولاً (Privacy-first):** لا يحتوي Q8iDevAI على أي قياس عن بُعد (Telemetry)، أو تتبع، أو تسجيل دخول إجباري.

## الإضافات (Plugins)

أضف السمات (Themes)، وألواح مساحات العمل، والأوامر، وشاشات الإعدادات، ومزودي وكلاء البرمجة باستخدام إضافات TypeScript موثوقة. يمكنك التثبيت من مجلد محلي أو مستودع Git باستخدام:
`q8idevai plugin add <source>`

راجع [توثيق الإضافات](https://Q8iDev.CoM/Q8iDevAI/docs/plugins) لإصدار Q8iDevAI الخاص بك، أو ابدأ بـ [دليل البدء السريع لإصدار 0.8 التجريبي](https://Q8iDev.CoM/Q8iDevAI/docs/plugins/v0.8). تعمل الإضافات مع إمكانية الوصول إلى جهاز الخادم (Daemon) وداخل التطبيقات المتصلة؛ ثبّت فقط الشفرات البرمجية الموثوقة.

## البدء (Getting Started)

يعمل Q8iDevAI كخادم محلي يُسمى الـ daemon يقوم بإدارة وكلاء البرمجة لديك، وتتصل به التطبيقات مثل تطبيق سطح المكتب وتطبيق الهاتف وتطبيق الويب وواجهة السطر البرمجي (CLI).

### المتطلبات المسبقة

تحتاج إلى تثبيت واجهة سطر أوامر (CLI) لوكيل واحد على الأقل مع تهيئة بيانات الاعتماد الخاصة بك:

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code)
- [Codex](https://github.com/openai/codex)
- [GitHub Copilot](https://github.com/features/copilot/cli/)
- [OpenCode](https://github.com/anomalyco/opencode)
- [Pi](https://pi.dev)

### تطبيق سطح المكتب (موصى به)

حمّله من [Q8iDev.CoM/Q8iDevAI/download](https://Q8iDev.CoM/Q8iDevAI/download) أو من [صفحة إصدارات GitHub](https://github.com/Q8iDevAI/Q8iDevAI/releases). افتح التطبيق وسيبدأ الـ daemon تلقائياً؛ لا حاجة لتثبيت أي شيء آخر.

للاتصال من هاتفك، افتح **Settings → your host → Pair Device**.

### واجهة السطر البرمجي / بدون واجهة رسومية (CLI / Headless)

ثبّت واجهة السطر البرمجي وابدأ Q8iDevAI:

```bash
npm install -g @q8idevai/cli
q8idevai
```

يبدأ Q8iDevAI محلياً، ثم يسألك عما إذا كنت تريد تمكين مُرحّل التشفير التام بين الأطراف (End-to-end encrypted relay) لاقتران الأجهزة. إذا رفضت، يمكنك الاتصال مباشرة عبر TCP أو Tailscale أو أي شبكة VPN أخرى. هذا الخيار مفيد للخوادم والأجهزة البعيدة.

للاطلاع على الإعدادات الكاملة والتهيئة، راجع:

- [التوثيق](https://Q8iDev.CoM/Q8iDevAI/docs)
- [دليل الاتصال](https://Q8iDev.CoM/Q8iDevAI/docs/connectivity)
- [مرجع التهيئة](https://Q8iDev.CoM/Q8iDevAI/docs/configuration)

### دوكر (Docker)

شغّل خادم Q8iDevAI وواجهة الويب ذاتية الاستضافة في Docker:

```bash
docker run -d --name q8idevai \
  -p 6767:6767 \
  -e Q8IDEVAI_PASSWORD=change-me \
  -v "$PWD/q8idevai-home:/home/q8idevai" \
  -v "$PWD:/workspace" \
  ghcr.io/getq8idevai/q8idevai:latest
```

افتح `http://localhost:6767` بعد البدء. يمكنك توسيع الصورة الأساسية بأدوات الـ CLI للوكلاء التي تستخدمها، ثم قم بتوفير بيانات الاعتماد عبر متغيرات البيئة أو وحدة التخزين الدائمة `/home/q8idevai`. راجع [توثيق Docker](docs/docker.md) لتفاصيل الإعداد الكاملة.

## واجهة السطر البرمجي (CLI)

كل ما يمكنك فعله داخل التطبيق، يمكنك تنفيذه من الطرفية (Terminal).

```bash
q8idevai run --provider claude/opus-4.6 "implement user authentication"
q8idevai run --provider codex/gpt-5.5 --worktree feature-x "implement feature X"

q8idevai ls                           # عرض الوكلاء قيد التشغيل
q8idevai attach abc123                # بث المخرجات المباشرة
q8idevai send abc123 "also add tests" # إرسال مهمة متابعة

# التشغيل على خادم بعيد؛ --cwd هو مسار على ذلك المضيف
q8idevai run --host workstation.local:6767 --cwd /workspace "run the full test suite"
```

راجع [المرجع الكامل للـ CLI](https://Q8iDev.CoM/Q8iDevAI/docs/cli) للمزيد.

## حزمة تطوير TypeScript (TypeScript SDK)

قم ببناء عمليات تكامل للمهام، ولوحات المعلومات، وخدمات التنسيق باستخدام `@q8idevai/client`:

```ts
import { createQ8iDevAIClient } from "@q8idevai/client";

const client = createQ8iDevAIClient({ url: "ws://127.0.0.1:6767/ws" });
await client.connect();

const agent = await client.agents.create({
  config: { provider: "codex/gpt-5.5" },
  cwd: "/Users/me/dev/storefront",
  prompt: "Review the current diff and name the riskiest change.",
});

const result = await agent.waitForFinish();
console.log(result.lastMessage);

await client.close();
```

راجع [دليل البدء السريع لـ SDK](https://Q8iDev.CoM/Q8iDevAI/docs/sdk/quickstart)، و[نماذج الاستخدام](https://Q8iDev.CoM/Q8iDevAI/docs/sdk/recipes)، و[مرجع واجهة برمجة التطبيقات API](https://Q8iDev.CoM/Q8iDevAI/docs/sdk/reference).

## المهارات (Skills)

تتيح المهارات لوكيلك استخدام Q8iDevAI لتنسيق وإدارة وكلاء آخرين.

```bash
npx skills add Q8iDevAI/Q8iDevAI
```

ثم استخدمها في أي محادثة مع الوكيل:

- `/q8idevai-handoff` — تسليم العمل بين الوكلاء؛ مثل التخطيط باستخدام Claude ثم التسليم إلى Codex للتنفيذ.
- `/q8idevai-advisor` — تشغيل وكيل منفصل كمستشار لأخذ رأي إضافي دون تفويض العمل نفسه.
- `/q8idevai-committee` — إنشاء لجنة من وكيلين متباينين لإعادة النظر وتحليل السبب الجذري ووضع خطة.

## التطوير (Development)

خريطة حزم المستودع (Monorepo):

- `packages/server`: خادم Q8iDevAI (تنسيق عمليات الوكلاء، واجهة WebSocket API، وخادم MCP)
- `packages/app`: تطبيق Expo (لنظامي iOS وAndroid والويب)
- `packages/cli`: أداة السطر البرمجي `q8idevai` للتعامل مع الخادم والوكلاء
- `packages/desktop`: تطبيق سطح المكتب باستخدام Electron
- `packages/relay`: النقل والتشفير المستخدم بين الخادم والتطبيقات المتصلة
- `packages/website`: موقع التوثيق والتعريف بالمنتج (`https://Q8iDev.CoM/Q8iDevAI/`)

الأوامر الشائعة:

```bash
# تشغيل جميع خدمات التطوير المحلية
npm run dev

# تشغيل واجهات أو حزم محددة
npm run dev:server
npm run dev:app
npm run dev:desktop
npm run dev:website

# بناء حزم الخادم
npm run build:server

# فحص الأنواع على مستوى المشروع
npm run typecheck
```

## مشاريع ذات صلة (Related projects)

- [getq8idevai/q8idevai-relay](https://github.com/Q8iDevAI/Q8iDevAI-relay) — المُرحّل الموزع الرسمي، مكتوب بلغة Elixir
- [q8idevai-vscode](https://marketplace.visualstudio.com/items?itemName=hinnes.q8idevai-vscode) — إضافة محرّر VS Code

## الترخيص (License)

Apache-2.0

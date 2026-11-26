#!/usr/bin/env python3
"""Build the service detail pages (services/<slug>.html) and their translations (i18n-services.js).

All page text lives below as (ru, en, kk) triples, so the four pages share one layout and
every string has its English and Kazakh version. Run after changing the text or after
scripts/bump-version.py (the pages reuse the cache versions from index.html):

    python scripts/build-service-pages.py
"""
import html
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "services"

T = lambda ru, en, kk: (ru, en, kk)  # noqa: E731 — a translated string

# ---------- shared labels ----------
L = {
    "home": T("Главная", "Home", "Басты бет"),
    "crumbs": T("Навигационная цепочка", "Breadcrumb", "Навигация тізбегі"),
    "services": T("Услуги", "Services", "Қызметтер"),
    "all": T("Все услуги", "All services", "Барлық қызметтер"),
    "eyebrow": T("УСЛУГА", "SERVICE", "ҚЫЗМЕТ"),
    "request": T("Оставить заявку", "Send an inquiry", "Өтінім қалдыру"),
    "about": T("О услуге", "About the service", "Қызмет туралы"),
    "tasks": T("Какие задачи решает", "What it solves", "Қандай міндеттерді шешеді"),
    "benefits": T("Что вы получаете", "What you get", "Сіз не аласыз"),
    "process": T("Как проходит сотрудничество", "How we work together", "Ынтымақтастық қалай өтеді"),
    "included": T("Что может входить в услугу", "What the service can include", "Қызметке не кіруі мүмкін"),
    "scope": T("Точный перечень работ согласуется до начала сотрудничества.", "The exact scope of work is agreed before we start.",
               "Жұмыстардың нақты тізімі ынтымақтастық басталғанға дейін келісіледі."),
    "faq": T("Частые вопросы", "Frequently asked questions", "Жиі қойылатын сұрақтар"),
    "cta_title": T("Обсудим вашу задачу", "Let's discuss your task", "Міндетіңізді талқылайық"),
    "cta_text": T("Оставьте заявку — мы уточним детали и предложим подходящий формат работы.",
                  "Send an inquiry and we will clarify the details and suggest a suitable format.",
                  "Өтінім қалдырыңыз — біз мәліметтерді нақтылап, қолайлы жұмыс форматын ұсынамыз."),
    "others": T("Другие услуги", "Other services", "Басқа қызметтер"),
    "more": T("Подробнее", "Learn more", "Толығырақ"),
    "contacts": T("Контакты", "Contact", "Байланыс"),
    "office": T("Наш офис", "Our office", "Біздің кеңсе"),
    "address": T("Шымкент, ул. Жолдасбекова, 51, 1 этаж", "Shymkent, 51 Zholdasbekov St., ground floor", "Шымкент, Жолдасбеков к-сі, 51, 1-қабат"),
    "open2gis": T("Открыть в 2ГИС", "Open in 2GIS", "2ГИС-те ашу"),
    "cost_q": T("Как определяется стоимость?", "How is the price determined?", "Құны қалай анықталады?"),
    "cost_a": T("Стоимость зависит от состава и объёма работ. Условия обсуждаются до начала сотрудничества.",
                "The price depends on the scope and volume of work. Terms are discussed before we start working together.",
                "Құны жұмыстардың құрамы мен көлеміне байланысты. Шарттар ынтымақтастық басталғанға дейін талқыланады."),
}

# The collaboration steps reuse the home page's wording (already translated in i18n.js).
STEPS = [("Заявка", "Вы описываете вопрос через форму или связываетесь с нами напрямую."),
         ("Консультация", "Уточняем потребности, особенности компании и детали задачи."),
         ("Предложение", "Подбираем возможный формат, обсуждаем состав и условия работ."),
         ("Сотрудничество", "Подтверждаем договорённости и начинаем согласованную работу.")]

PHOTO = "https://images.unsplash.com/photo-{}?auto=format&fit=crop&q=80&w={}&h={}"

SERVICES = [
    {
        "slug": "accounting",
        "photo": "1772588627373-729b0f47e5bb",
        "alt": T("Специалист проверяет документы и расчёты на калькуляторе", "A specialist checks documents and calculations", "Маман құжаттар мен есептеулерді тексеруде"),
        "name": T("Бухгалтерский учёт", "Accounting", "Бухгалтерлік есеп"),
        "lead": T("Помогаем поддерживать порядок в учётных данных и документах, готовить отчётность и организовывать регулярные бухгалтерские процессы.",
                  "We help keep accounting records and documents in order, prepare reports and organise regular accounting routines.",
                  "Есеп деректері мен құжаттардағы тәртіпті сақтауға, есептілік дайындауға және тұрақты бухгалтерлік процестерді ұйымдастыруға көмектесеміз."),
        "about": [
            T("Бухгалтерский учёт — основа для налоговой отчётности, расчётов с сотрудниками и управленческих решений. Мы помогаем выстроить его так, чтобы данные были в порядке, а сроки — под контролем.",
              "Accounting is the basis for tax reporting, payroll and management decisions. We help set it up so your data stays in order and deadlines stay under control.",
              "Бухгалтерлік есеп — салықтық есептіліктің, қызметкерлермен есеп айырысудың және басқару шешімдерінің негізі. Деректер реттелген, мерзімдер бақылауда болатындай етіп оны құруға көмектесеміз."),
            T("Состав работ зависит от деятельности компании и текущего состояния учёта. Перед началом уточняем исходные данные, задачи и ожидаемый формат взаимодействия.",
              "The scope depends on your business and the current state of your books. Before we start, we clarify the inputs, tasks and the way we will work together.",
              "Жұмыс құрамы компанияның қызметіне және есептің қазіргі жағдайына байланысты. Бастамас бұрын бастапқы деректерді, міндеттерді және өзара әрекеттесу форматын нақтылаймыз."),
        ],
        "tasks": [
            T("Документы и первичная документация разрознены и плохо систематизированы.", "Documents and source records are scattered and poorly organised.", "Құжаттар мен бастапқы құжаттама шашыраңқы және жүйеленбеген."),
            T("Нет уверенности, что отчётность сдаётся полностью и в срок.", "You are not sure that reports are filed completely and on time.", "Есептіліктің толық және уақытында тапсырылатынына сенім жоқ."),
            T("Собственнику не хватает времени разбираться в учёте самостоятельно.", "The owner has no time to deal with the accounting personally.", "Иесінің есепті өзі түсінуге уақыты жетпейді."),
            T("Нужен понятный порядок обмена документами с бухгалтером.", "You need a clear way to exchange documents with your accountant.", "Бухгалтермен құжат алмасудың түсінікті тәртібі қажет."),
        ],
        "benefits": [
            T("Порядок в учётных данных и документах.", "Accounting records and documents in order.", "Есеп деректері мен құжаттарда тәртіп."),
            T("Понятный график работ и сроков.", "A clear schedule of work and deadlines.", "Жұмыстар мен мерзімдердің түсінікті кестесі."),
            T("Прозрачная картина финансов компании.", "A transparent picture of the company's finances.", "Компания қаржысының айқын көрінісі."),
            T("Больше времени на развитие бизнеса.", "More time to grow your business.", "Бизнесті дамытуға көбірек уақыт."),
        ],
        "included": [
            T("Ведение бухгалтерского учёта по данным первичных документов.", "Bookkeeping based on source documents.", "Бастапқы құжаттар деректері бойынша бухгалтерлік есеп жүргізу."),
            T("Подготовка и сдача налоговой и статистической отчётности.", "Preparing and filing tax and statistical reports.", "Салықтық және статистикалық есептілікті дайындау және тапсыру."),
            T("Расчёт заработной платы и связанных с ней налогов и взносов.", "Payroll and the related taxes and contributions.", "Жалақыны және оған байланысты салықтар мен жарналарды есептеу."),
            T("Сверки с контрагентами и контроль первичной документации.", "Reconciliations with counterparties and checks of source documents.", "Контрагенттермен салыстыру және бастапқы құжаттаманы бақылау."),
            T("Консультации по текущим учётным вопросам.", "Advice on day-to-day accounting questions.", "Ағымдағы есеп мәселелері бойынша кеңестер."),
        ],
        "faq": [
            (T("С какими компаниями вы работаете?", "What kind of companies do you work with?", "Қандай компаниялармен жұмыс істейсіз?"),
             T("Обсуждаем задачи индивидуальных предпринимателей и компаний. Подходит ли формат вашей ситуации, уточняем на первой консультации.",
               "We discuss the needs of sole proprietors and companies. Whether the format fits your situation is clarified at the first consultation.",
               "Жеке кәсіпкерлер мен компаниялардың міндеттерін талқылаймыз. Форматтың сіздің жағдайыңызға сәйкестігін алғашқы кеңесте нақтылаймыз.")),
            (T("Что нужно для начала работы?", "What do you need to get started?", "Жұмысты бастау үшін не қажет?"),
             T("Достаточно кратко описать вашу деятельность и текущее состояние учёта. Список документов мы подскажем после обсуждения.",
               "A short description of your business and the current state of your books is enough. We will tell you which documents are needed after we talk.",
               "Қызметіңізді және есептің қазіргі жағдайын қысқаша сипаттау жеткілікті. Құжаттар тізімін талқылаудан кейін айтамыз.")),
        ],
    },
    {
        "slug": "tax",
        "photo": "1709880945165-d2208c6ad2ec",
        "alt": T("Калькулятор и ноутбук на рабочем столе бухгалтера", "A calculator and laptop on an accountant's desk", "Бухгалтер үстеліндегі калькулятор мен ноутбук"),
        "name": T("Налоговое сопровождение", "Tax support", "Салықтық сүйемелдеу"),
        "lead": T("Консультируем по налоговым вопросам и помогаем разобраться в налоговых обязательствах компании.",
                  "We advise on tax matters and help you understand your company's tax obligations.",
                  "Салық мәселелері бойынша кеңес береміз және компанияның салықтық міндеттемелерін түсінуге көмектесеміз."),
        "about": [
            T("Налоговые требования меняются, а ошибки в расчётах и сроках могут обойтись дорого. Мы помогаем понять, какие обязательства есть у вашего бизнеса и как организовать работу с ними.",
              "Tax rules change, and mistakes in calculations or deadlines can be costly. We help you understand your business's obligations and how to organise the work around them.",
              "Салық талаптары өзгереді, ал есептеулер мен мерзімдердегі қателер қымбатқа түсуі мүмкін. Бизнесіңіздің қандай міндеттемелері бар екенін және олармен жұмысты қалай ұйымдастыру керектігін түсінуге көмектесеміз."),
            T("Начинаем с уточнения вопроса и имеющихся материалов. Объём сопровождения и перечень работ согласуются индивидуально.",
              "We start by clarifying the question and the materials you have. The scope of support and the list of work are agreed individually.",
              "Сұрақты және бар материалдарды нақтылаудан бастаймыз. Сүйемелдеу көлемі мен жұмыстар тізімі жеке келісіледі."),
        ],
        "tasks": [
            T("Непонятно, какие налоги и в какие сроки нужно платить.", "It is unclear which taxes are due and when.", "Қандай салықтарды және қандай мерзімде төлеу керектігі түсініксіз."),
            T("Нужно подготовиться к сдаче налоговой отчётности.", "You need to prepare for filing tax returns.", "Салықтық есептілікті тапсыруға дайындалу керек."),
            T("Возник вопрос по налоговому уведомлению или запросу.", "You have received a tax notice or request.", "Салықтық хабарлама немесе сұрау бойынша мәселе туындады."),
            T("Хочется разобраться, подходит ли текущий налоговый режим.", "You want to know whether your current tax regime is the right one.", "Ағымдағы салық режимінің сәйкестігін анықтағыңыз келеді."),
        ],
        "benefits": [
            T("Ясность в налоговых обязательствах компании.", "Clarity about the company's tax obligations.", "Компанияның салықтық міндеттемелерінде айқындық."),
            T("Понятный календарь платежей и отчётности.", "A clear calendar of payments and filings.", "Төлемдер мен есептіліктің түсінікті күнтізбесі."),
            T("Понятная последовательность действий в сложных вопросах.", "A clear sequence of steps for complex questions.", "Күрделі мәселелердегі әрекеттердің түсінікті реттілігі."),
            T("Подготовленность к общению с налоговыми органами.", "Being prepared when dealing with the tax authorities.", "Салық органдарымен қарым-қатынасқа дайындық."),
        ],
        "included": [
            T("Консультации по налоговым вопросам бизнеса.", "Advice on business tax questions.", "Бизнестің салық мәселелері бойынша кеңестер."),
            T("Анализ налоговых обязательств и сроков.", "Review of tax obligations and deadlines.", "Салықтық міндеттемелер мен мерзімдерді талдау."),
            T("Подготовка налоговой отчётности.", "Preparing tax returns.", "Салықтық есептілікті дайындау."),
            T("Помощь с ответами на уведомления и запросы.", "Help with responses to notices and requests.", "Хабарламалар мен сұрауларға жауап беруге көмек."),
            T("Рекомендации по выбору налогового режима.", "Recommendations on choosing a tax regime.", "Салық режимін таңдау бойынша ұсынымдар."),
        ],
        "faq": [
            (T("Можно обратиться с одним налоговым вопросом?", "Can I come with a single tax question?", "Бір салық сұрағымен жүгінуге бола ма?"),
             T("Да. Опишите вопрос — мы уточним детали и предложим формат консультации.", "Yes. Describe your question and we will clarify the details and suggest a consultation format.",
               "Иә. Сұрағыңызды сипаттаңыз — біз мәліметтерді нақтылап, кеңес форматын ұсынамыз.")),
            (T("Вы работаете с ИП и компаниями?", "Do you work with sole proprietors and companies?", "Жеке кәсіпкерлермен және компаниялармен жұмыс істейсіз бе?"),
             T("Да, обсуждаем налоговые вопросы как индивидуальных предпринимателей, так и компаний.", "Yes, we discuss tax questions of both sole proprietors and companies.",
               "Иә, жеке кәсіпкерлердің де, компаниялардың да салық мәселелерін талқылаймыз.")),
        ],
    },
    {
        "slug": "hr",
        "photo": "1758520144427-ddb02ac74e9d",
        "alt": T("Рукопожатие на встрече с сотрудником", "A handshake at a meeting with an employee", "Қызметкермен кездесудегі қол алысу"),
        "name": T("Кадровое делопроизводство", "HR administration", "Кадрлық іс жүргізу"),
        "lead": T("Помогаем оформлять кадровые документы и выстраивать понятный порядок работы с кадровыми процессами и данными сотрудников.",
                  "We help prepare HR documents and set up a clear order for HR processes and employee data.",
                  "Кадрлық құжаттарды ресімдеуге және кадрлық процестер мен қызметкерлер деректерімен жұмыс істеудің түсінікті тәртібін құруға көмектесеміз."),
        "about": [
            T("Кадровые документы нужны при приёме, переводе и увольнении сотрудников, а также при проверках. Мы помогаем вести их аккуратно и в едином порядке.",
              "HR documents are needed when hiring, transferring and dismissing employees, as well as during inspections. We help keep them accurate and consistent.",
              "Кадрлық құжаттар қызметкерлерді қабылдау, ауыстыру және жұмыстан шығару кезінде, сондай-ақ тексерулерде қажет. Оларды ұқыпты әрі бірыңғай тәртіпте жүргізуге көмектесеміз."),
            T("Сначала уточняем существующий процесс и потребности компании, затем определяем, какие задачи и документы входят в согласованный объём.",
              "First we look at your current process and needs, then we agree which tasks and documents are included.",
              "Алдымен қолданыстағы процесті және компанияның қажеттіліктерін нақтылаймыз, содан кейін келісілген көлемге қандай міндеттер мен құжаттар кіретінін анықтаймыз."),
        ],
        "tasks": [
            T("Кадровые документы оформляются от случая к случаю.", "HR documents are prepared only now and then.", "Кадрлық құжаттар анда-санда ресімделеді."),
            T("Нужно оформить приём, перевод или увольнение сотрудника.", "You need to process a hire, transfer or dismissal.", "Қызметкерді қабылдауды, ауыстыруды немесе жұмыстан шығаруды ресімдеу керек."),
            T("Нет единого порядка хранения кадровых данных.", "There is no consistent way to keep employee data.", "Кадрлық деректерді сақтаудың бірыңғай тәртібі жоқ."),
            T("Нужно подготовить документы к проверке.", "You need to prepare documents for an inspection.", "Құжаттарды тексеруге дайындау керек."),
        ],
        "benefits": [
            T("Аккуратно оформленные кадровые документы.", "Properly prepared HR documents.", "Ұқыпты ресімделген кадрлық құжаттар."),
            T("Единый порядок работы с данными сотрудников.", "One consistent way of handling employee data.", "Қызметкерлер деректерімен жұмыстың бірыңғай тәртібі."),
            T("Меньше рутины для руководителя.", "Less routine work for the manager.", "Басшы үшін күнделікті жұмыстың азаюы."),
            T("Кадровые задачи в согласованном и понятном формате.", "HR tasks handled in an agreed, clear format.", "Кадрлық міндеттер келісілген әрі түсінікті форматта."),
        ],
        "included": [
            T("Оформление приёма, перевода и увольнения сотрудников.", "Processing hires, transfers and dismissals.", "Қызметкерлерді қабылдауды, ауыстыруды және жұмыстан шығаруды ресімдеу."),
            T("Подготовка трудовых договоров и приказов.", "Preparing employment contracts and orders.", "Еңбек шарттары мен бұйрықтарды дайындау."),
            T("Ведение кадровой документации.", "Maintaining HR records.", "Кадрлық құжаттаманы жүргізу."),
            T("Учёт отпусков и графиков работы.", "Tracking leave and work schedules.", "Демалыстар мен жұмыс кестелерін есепке алу."),
            T("Консультации по кадровым вопросам.", "Advice on HR questions.", "Кадр мәселелері бойынша кеңестер."),
        ],
        "faq": [
            (T("Можно передать только часть кадровых задач?", "Can I hand over only part of the HR tasks?", "Кадрлық міндеттердің бір бөлігін ғана беруге бола ма?"),
             T("Да. Мы обсуждаем, какие задачи и документы войдут в согласованный объём работы.", "Yes. We agree which tasks and documents are included in the scope of work.",
               "Иә. Келісілген жұмыс көлеміне қандай міндеттер мен құжаттар кіретінін талқылаймыз.")),
            (T("С чего начать?", "Where do we start?", "Неден бастау керек?"),
             T("Расскажите о количестве сотрудников и текущем порядке оформления документов — дальше мы подскажем, что понадобится.",
               "Tell us how many employees you have and how documents are handled now, and we will tell you what is needed next.",
               "Қызметкерлер саны және құжаттарды ресімдеудің қазіргі тәртібі туралы айтыңыз — әрі қарай не қажет екенін айтамыз.")),
        ],
    },
    {
        "slug": "consulting",
        "photo": "1517245386807-bb43f82c33c4",
        "alt": T("Обсуждение задачи на деловой встрече", "Discussing a task at a business meeting", "Іскерлік кездесуде міндетті талқылау"),
        "name": T("Бизнес-консалтинг", "Business consulting", "Бизнес-консалтинг"),
        "lead": T("Помогаем компаниям находить точки роста, улучшать процессы и принимать эффективные управленческие решения.",
                  "We help companies find growth points, improve processes and make sound management decisions.",
                  "Компанияларға өсу нүктелерін табуға, процестерді жақсартуға және тиімді басқару шешімдерін қабылдауға көмектесеміз."),
        "about": [
            T("Консультация помогает взглянуть на ситуацию со стороны: структурировать информацию, оценить варианты и определить следующие шаги.",
              "A consultation helps you look at the situation from the outside: structure the information, weigh the options and decide on the next steps.",
              "Кеңес жағдайға сырттан қарауға көмектеседі: ақпаратты жүйелеуге, нұсқаларды бағалауға және келесі қадамдарды анықтауға."),
            T("Вы описываете задачу, мы уточняем детали и согласуем тему, формат консультации и ожидаемый результат разговора.",
              "You describe the task, we clarify the details and agree on the topic, format and expected outcome of the consultation.",
              "Сіз міндетті сипаттайсыз, біз мәліметтерді нақтылап, кеңестің тақырыбын, форматын және күтілетін нәтижесін келісеміз."),
        ],
        "tasks": [
            T("Нужно принять важное управленческое решение.", "You need to make an important management decision.", "Маңызды басқару шешімін қабылдау керек."),
            T("Процессы в компании работают неэффективно.", "Processes in the company are not efficient.", "Компаниядағы процестер тиімсіз жұмыс істейді."),
            T("Бизнес растёт, и нужно выстроить порядок.", "The business is growing and needs structure.", "Бизнес өсуде және тәртіп орнату керек."),
            T("Хочется получить профессиональный взгляд со стороны.", "You want a professional outside view.", "Сырттан кәсіби көзқарас алғыңыз келеді."),
        ],
        "benefits": [
            T("Структурированное понимание ситуации.", "A structured understanding of the situation.", "Жағдайды жүйелі түсіну."),
            T("Варианты решений и их последствия.", "Options and their consequences.", "Шешім нұсқалары және олардың салдары."),
            T("Понятный план следующих шагов.", "A clear plan of next steps.", "Келесі қадамдардың түсінікті жоспары."),
            T("Фокус на вашем запросе и понятных следующих шагах.", "Focus on your request and on clear next steps.", "Сіздің сұрауыңызға және түсінікті келесі қадамдарға назар."),
        ],
        "included": [
            T("Разбор ситуации и уточнение запроса.", "Reviewing the situation and clarifying the request.", "Жағдайды талдау және сұрауды нақтылау."),
            T("Анализ процессов и текущих данных.", "Analysing processes and current data.", "Процестер мен ағымдағы деректерді талдау."),
            T("Обсуждение вариантов решений.", "Discussing possible solutions.", "Шешім нұсқаларын талқылау."),
            T("Рекомендации по следующим шагам.", "Recommendations on the next steps.", "Келесі қадамдар бойынша ұсынымдар."),
            T("Повторные консультации по договорённости.", "Follow-up consultations by agreement.", "Келісім бойынша қайталама кеңестер."),
        ],
        "faq": [
            (T("Можно обратиться по одному вопросу?", "Can I come with just one question?", "Бір сұрақпен жүгінуге бола ма?"),
             T("Да. Опишите конкретную задачу — мы обсудим, входит ли она в наши направления и какой формат может подойти.",
               "Yes. Describe the specific task and we will discuss whether it is within our services and what format may suit.",
               "Иә. Нақты міндетті сипаттаңыз — біз оның біздің бағыттарға кіретін-кірмейтінін және қандай формат сәйкес келетінін талқылаймыз.")),
            (T("Вы работаете дистанционно?", "Do you work remotely?", "Қашықтан жұмыс істейсіз бе?"),
             T("Формат взаимодействия уточняется при обращении с учётом задачи и удобного способа коммуникации.",
               "The format is agreed when you contact us, depending on the task and the most convenient way to communicate.",
               "Өзара әрекеттесу форматы жүгінген кезде міндетке және ыңғайлы байланыс тәсіліне қарай нақтыланады.")),
        ],
    },
]

TITLE_SUFFIX = " — OPEN CONSULTING"
MARK = ('<svg class="brand-mark" viewBox="0 0 633 360" aria-hidden="true" focusable="false"><path fill-rule="evenodd" d="M0 0H175L361 180V360H186L0 180ZM91 92V269H270V92Z"/>'
        '<path d="M361 0H633V92H453V269H633V360H546L361 180Z"/></svg><span class="brand-name"><span class="brand-open">OPEN</span><span class="brand-sub">consulting</span></span>')


def e(value):
    return html.escape(value, quote=True)


def versions():
    index = (ROOT / "index.html").read_text(encoding="utf-8")
    found = dict(re.findall(r'"((?:theme\.css|i18n\.js|script\.js|contact-config\.js))\?v=([^"]+)"', index))
    missing = {"theme.css", "i18n.js", "script.js", "contact-config.js"} - set(found)
    if missing:
        sys.exit(f"index.html has no ?v= for {sorted(missing)} — run scripts/bump-version.py first")
    return found


def shared_chrome():
    index = (ROOT / "index.html").read_text(encoding="utf-8")
    fonts = re.search(r'<link href="https://fonts\.googleapis\.com/css2[^"]+" rel="stylesheet">', index).group(0)
    footer = re.search(r'<footer class="footer">.*?</footer>', index, re.S).group(0)
    fab = re.search(r'<div class="contact-fab">.*?</button></div>', index, re.S).group(0)
    mobile = re.search(r'<nav class="mobile-bar".*?</nav>', index, re.S).group(0)
    # Links that point into the home page need the ../index.html prefix.
    footer = re.sub(r'href="#(contact|about|services|why-us|process|faq)"', r'href="../index.html#\1"', footer)
    footer = footer.replace('href="privacy.html"', 'href="../privacy.html"')
    mobile = mobile.replace('href="#contact"', 'href="../index.html#contact"')
    return fonts, footer, fab, mobile


def page(service, others, v):
    fonts, footer, fab, mobile = shared_chrome()
    slug = service["slug"]
    name, lead = service["name"][0], service["lead"][0]
    request_link = f"../index.html?service={slug}#contact"
    photo = service["photo"]
    img = (f'<img src="{PHOTO.format(photo, 1400, 860)}" srcset="{PHOTO.format(photo, 800, 492)} 800w, {PHOTO.format(photo, 1400, 860)} 1400w" '
           f'sizes="(max-width: 860px) 100vw, 1200px" alt="{e(service["alt"][0])}" width="1400" height="860" fetchpriority="high" decoding="async">')
    li = lambda items: "".join(f"<li>{e(x[0])}</li>" for x in items)  # noqa: E731
    steps = "".join(f'<li class="step reveal"><span class="step-no">0{i + 1}</span><h3>{e(t)}</h3><p>{e(d)}</p></li>' for i, (t, d) in enumerate(STEPS))
    faq = "".join(f'<details><summary>{e(q[0])}<span aria-hidden="true">+</span></summary><p>{e(a[0])}</p></details>'
                  for q, a in service["faq"] + [(L["cost_q"], L["cost_a"])])
    other_cards = "".join(
        f'<a class="svc-mini" href="{o["slug"]}.html"><img src="{PHOTO.format(o["photo"], 480, 300)}" alt="" width="480" height="300" loading="lazy" decoding="async">'
        f'<span><strong>{e(o["name"][0])}</strong><span class="svc-more">{e(L["more"][0])} <span aria-hidden="true">→</span></span></span></a>' for o in others)
    head_scripts = (f'  <script src="../contact-config.js?v={v["contact-config.js"]}" defer></script>\n'
                    f'  <script src="../i18n-services.js?v={v["i18n.js"]}" defer></script>\n'
                    f'  <script src="../i18n.js?v={v["i18n.js"]}" defer></script>\n'
                    f'  <script src="../script.js?v={v["script.js"]}" defer></script>\n')
    return f"""<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#FFFFFF">
  <meta name="description" content="{e(lead)}">
  <meta property="og:title" content="{e(name + TITLE_SUFFIX)}">
  <meta property="og:description" content="{e(lead)}">
  <meta property="og:type" content="website">
  <meta property="og:image" content="{PHOTO.format(photo, 1200, 630)}">
  <title>{e(name + TITLE_SUFFIX)}</title>
  <link rel="icon" href="../favicon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  {fonts}
  <link rel="stylesheet" href="../theme.css?v={v["theme.css"]}">
  <script>document.documentElement.classList.add("js");</script>
{head_scripts}</head>
<body class="service-page">
  <div class="scroll-progress" aria-hidden="true"></div>
  <div class="cursor-ring" aria-hidden="true"></div><div class="cursor-dot" aria-hidden="true"></div>
  <a class="skip-link" href="#main-content">Перейти к содержимому</a>
  <header class="header" id="top">
    <div class="container nav-wrap">
      <a class="brand" href="../index.html" aria-label="OPEN CONSULTING — на главную">{MARK}</a>
      <div class="language-switcher" role="group" aria-label="Язык сайта">
        <button type="button" data-language="ru" aria-label="Русский" aria-pressed="true">RU</button>
        <button type="button" data-language="en" aria-label="Английский" aria-pressed="false">EN</button>
        <button type="button" data-language="kk" aria-label="Казахский" aria-pressed="false">KZ</button>
      </div>
      <button class="menu-toggle" type="button" aria-label="Открыть меню" aria-expanded="false" aria-controls="primary-navigation"><span></span><span></span></button>
      <nav class="nav" id="primary-navigation" aria-label="Главная навигация">
        <a href="../index.html#services" class="active">Услуги</a><a href="../index.html#why-us">Почему мы</a><a href="../index.html#process">Этапы</a><a href="../index.html#about">О компании</a><a href="../index.html#faq">FAQ</a>
        <a class="nav-contact-link" href="{request_link}">Контакты <span>↗</span></a>
      </nav>
      <a class="nav-cta" href="{request_link}">Оставить заявку <span>↗</span></a>
    </div>
  </header>

  <main id="main-content">
    <section class="svc-hero">
      <div class="container">
        <nav class="breadcrumbs" aria-label="{e(L["crumbs"][0])}"><a href="../index.html">{e(L["home"][0])}</a><span aria-hidden="true">/</span><a href="../index.html#services">{e(L["services"][0])}</a><span aria-hidden="true">/</span><span aria-current="page">{e(name)}</span></nav>
        <div class="svc-hero-grid">
          <div class="svc-hero-copy">
            <div class="eyebrow"><span class="eyebrow-dot"></span> {e(L["eyebrow"][0])}</div>
            <h1 class="svc-h1"><span class="h1-line"><span>{e(name)}</span></span></h1>
            <p class="hero-lead svc-lead">{e(lead)}</p>
            <div class="hero-actions"><a class="button button-primary" href="{request_link}" data-service="{slug}">{e(L["request"][0])} <span>↗</span></a><a class="button button-outline" href="../index.html#services">{e(L["all"][0])} <span>←</span></a></div>
          </div>
        </div>
        <div class="svc-photo">{img}</div>
      </div>
    </section>

    <section class="section svc-section">
      <div class="container svc-two">
        <div class="reveal"><div class="section-label"><span>{e(L["about"][0])}</span><span class="label-line"></span></div></div>
        <div class="svc-about reveal">{"".join(f"<p>{e(p[0])}</p>" for p in service["about"])}</div>
      </div>
    </section>

    <section class="section svc-section svc-alt">
      <div class="container svc-cols">
        <div class="svc-box reveal"><h2>{e(L["tasks"][0])}</h2><ul class="svc-list svc-list-q">{li(service["tasks"])}</ul></div>
        <div class="svc-box reveal"><h2>{e(L["benefits"][0])}</h2><ul class="svc-list svc-list-check">{li(service["benefits"])}</ul></div>
      </div>
    </section>

    <section class="section svc-section">
      <div class="container">
        <div class="reveal"><div class="section-label"><span>{e(L["process"][0])}</span><span class="label-line"></span></div></div>
        <ol class="steps svc-steps">{steps}</ol>
      </div>
    </section>

    <section class="section svc-section svc-alt">
      <div class="container svc-two">
        <div class="reveal"><h2 class="svc-h2">{e(L["included"][0])}</h2><p class="svc-note">{e(L["scope"][0])}</p></div>
        <ul class="svc-list svc-list-check svc-included reveal">{li(service["included"])}</ul>
      </div>
    </section>

    <section class="section svc-section faq">
      <div class="container faq-grid">
        <div class="faq-heading reveal"><h2 class="svc-h2">{e(L["faq"][0])}</h2></div>
        <div class="faq-list reveal">{faq}</div>
      </div>
    </section>

    <section class="svc-cta">
      <div class="container svc-cta-inner reveal">
        <div><h2>{e(L["cta_title"][0])}</h2><p>{e(L["cta_text"][0])}</p></div>
        <div class="svc-cta-side">
          <a class="button button-primary" href="{request_link}">{e(L["request"][0])} <span>↗</span></a>
          <div class="svc-contacts"><strong>{e(L["contacts"][0])}</strong><a href="tel:+77474274103">+7 747 427 41 03</a><a data-whatsapp-link href="https://wa.me/77075885577" target="_blank" rel="noopener noreferrer">WhatsApp</a><a href="https://2gis.kz/shymkent/firm/70000001036225196" target="_blank" rel="noopener noreferrer">{e(L["address"][0])}</a></div>
        </div>
      </div>
    </section>

    <section class="section svc-section">
      <div class="container">
        <div class="svc-others-head reveal"><h2 class="svc-h2">{e(L["others"][0])}</h2><a class="text-link" href="../index.html#services">{e(L["all"][0])} <span>↗</span></a></div>
        <div class="svc-others reveal">{other_cards}</div>
      </div>
    </section>
  </main>

  {footer}
  {mobile}
  {fab}
</body>
</html>
"""


def translations():
    entries = {}
    def add(triple):
        ru, en, kk = triple
        entries[ru] = (en, kk)
    for value in L.values():
        add(value)
    for service in SERVICES:
        for key in ("alt", "name", "lead"):
            add(service[key])
        ru, en, kk = service["name"]
        add((ru + TITLE_SUFFIX, en + TITLE_SUFFIX, kk + TITLE_SUFFIX))
        for group in ("about", "tasks", "benefits", "included"):
            for item in service[group]:
                add(item)
        for q, a in service["faq"]:
            add(q)
            add(a)
    lines = ["// Generated by scripts/build-service-pages.py — edit the text there, not here.",
             "// Strings of the service pages; i18n.js merges them into its dictionary.",
             "window.OC_EXTRA_TRANSLATIONS = {"]
    for ru, (en, kk) in entries.items():
        lines.append(f"    {json.dumps(ru, ensure_ascii=False)}: {{ en: {json.dumps(en, ensure_ascii=False)}, kk: {json.dumps(kk, ensure_ascii=False)} }},")
    lines.append("};")
    return "\n".join(lines) + "\n"


def main():
    v = versions()
    OUT.mkdir(exist_ok=True)
    for service in SERVICES:
        others = [o for o in SERVICES if o is not service]
        (OUT / f"{service['slug']}.html").write_text(page(service, others, v), encoding="utf-8")
    (ROOT / "i18n-services.js").write_text(translations(), encoding="utf-8")
    print(f"Built {len(SERVICES)} service pages in services/ and i18n-services.js")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()

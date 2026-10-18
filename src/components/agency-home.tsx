"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, ArrowRight, Cpu, Workflow, Code2, Bot } from "lucide-react";
import { ContactRequest } from "./contact-request";
import { showcaseProjects } from "@/data/showcase-projects";
import s from "./agency-home.module.css";

const services = [
  { icon: Cpu, title: "ИИ в работе компании", text: "AI-ассистенты, работа с документами и знаниями, анализ обращений. Подключаем к конкретному процессу, а не просто к чату.", tags: "AI-агенты / Базы знаний / Аналитика" },
  { icon: Code2, title: "Цифровые продукты", text: "Сайты, личные кабинеты, CRM и внутренние сервисы. Проектируем интерфейс и разрабатываем систему под вашу задачу.", tags: "Веб-сервисы / CRM / MVP" },
  { icon: Workflow, title: "Интеграции и автоматизация", text: "Связываем инструменты, убираем повторный ввод и передаём данные между системами. Человек контролирует важные решения.", tags: "API / Бизнес-процессы / Интеграции" },
  { icon: Bot, title: "Робототехника и устройства", text: "От идеи до проверки на прототипе: компьютерное зрение, датчики и управление. Состав оборудования определяем после исследования.", tags: "R&D / Computer vision / Прототипы" },
];

export function AgencyHome() {
  const [theme, setTheme] = useState<"system" | "dark" | "light">("system");
  return <div className={s.page} data-theme={theme}>
    <a className={s.skip} href="#main">К содержимому</a>
    <header className={s.header}>
      <Link className={s.brand} href="/" aria-label="VibeForge, главная"><Image src="/vibeforge-logo-official.png" alt="" width={48} height={48} priority /><span>VibeForge</span></Link>
      <nav aria-label="Основная навигация"><a href="#services">Возможности</a><a href="#projects">Проекты</a><a href="#approach">Как работаем</a></nav>
      <a className={s.headerCta} href="#request">Оставить заявку <ArrowUpRight aria-hidden="true" /></a>
    </header>
    <main id="main">
      <section className={s.hero}>
        <div className={s.heroCopy}><p className={s.eyebrow}>Сайт обновлён — проверка связи</p><h1>Ваши идеи.<br /><span>Наша инженерия.</span></h1><p className={s.lead}>Внедряем ИИ и создаём цифровые продукты для бизнеса. От автоматизации процессов до робототехники.</p><div className={s.actions}><a className={s.primary} href="#request">Оставить заявку <ArrowUpRight aria-hidden="true" /></a><a className={s.textLink} href="#projects">Смотреть проекты <ArrowRight aria-hidden="true" /></a></div></div>
        <figure className={s.heroArt}><Image src="/vibeforge-robotics-concept.png" alt="Концептуальная иллюстрация: точный роботизированный захват держит вычислительный модуль" width={1536} height={1024} priority unoptimized /><figcaption>Визуальная концепция направления робототехники</figcaption></figure>
      </section>
      <section id="services" className={s.section} aria-labelledby="services-title">
        <h2 id="services-title">Технологии под задачу.<br /><span>Не наоборот.</span></h2>
        <div className={s.services}>{services.map(({ icon: Icon, title, text, tags }) => <article key={title}><Icon className={s.serviceIcon} aria-hidden="true" /><h3>{title}</h3><p>{text}</p><small>{tags}</small></article>)}</div>
      </section>
      <section id="projects" className={s.section} aria-labelledby="projects-title">
        <div className={s.sectionHeading}><h2 id="projects-title">Что мы создаём</h2><p>Продукты и направления, через которые можно познакомиться с нашими возможностями.</p></div>
        <div className={s.projects}>{showcaseProjects.map(project => <article key={project.title} className={s.project}><Link href={project.href} className={s.projectImage} aria-label={project.action + ": " + project.title}><Image src={project.image} alt={project.alt} width={1440} height={960} unoptimized /></Link><div className={s.projectMeta}><span>{project.category}</span><span>{project.status}</span></div><h3>{project.title}</h3><p>{project.description}</p><Link className={s.textLink} href={project.href}>{project.action}<ArrowUpRight aria-hidden="true" /></Link></article>)}</div>
      </section>
      <section id="approach" className={`${s.section} ${s.approach}`} aria-labelledby="approach-title"><div><p className={s.eyebrow}>От задачи до запуска</p><h2 id="approach-title">Вместе на каждом этапе.</h2><p>Начинаем с процесса, который нужно улучшить. Объём, сроки и стоимость фиксируем после знакомства с задачей.</p></div><ol><li><h3>Разбираемся в задаче</h3><p>Изучаем процесс, ограничения и критерий полезного результата.</p></li><li><h3>Проверяем решение</h3><p>Показываем прототип и согласуем архитектуру, интеграции и план разработки.</p></li><li><h3>Создаём и внедряем</h3><p>Разрабатываем, тестируем и подключаем систему к вашей работе.</p></li><li><h3>Поддерживаем и развиваем</h3><p>Согласуем поддержку, следим за обратной связью и планируем улучшения.</p></li></ol></section>
      <section id="request" className={`${s.section} ${s.request}`} aria-labelledby="request-title"><div className={s.requestIntro}><h2 id="request-title">Что вы хотите<br /><span>создать?</span></h2><p>Расскажите об идее или процессе, который хочется изменить. Обсудим, где технологии действительно помогут.</p><a className={s.phone} href="tel:+77081102995">+7 708 110 29 95</a><a className={s.textLink} href="https://wa.me/77081102995">Написать в WhatsApp ↗</a><p className={s.owner}>На связи Руслан</p></div><ContactRequest /></section>
    </main>
    <footer className={s.footer}><div className={s.footerTop}><span className={s.footerBrand}>VibeForge</span><p>ИИ. Программное обеспечение. Инженерия.</p></div><div className={s.footerBottom}><span>© {new Date().getFullYear()} VibeForge</span><button className={s.themeButton} onClick={() => setTheme(theme === "system" ? "dark" : theme === "dark" ? "light" : "system")}>Тема: {theme === "system" ? "системная" : theme === "dark" ? "тёмная" : "светлая"}</button><Link href="/privacy">Конфиденциальность</Link><Link href="/business-pulse">Вход в CRM</Link><a href="#main">Наверх ↑</a></div></footer>
  </div>;
}

import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowLeftRight,
  Bell,
  Building2,
  ChevronRight,
  CircleCheck,
  Eye,
  EyeOff,
  FileText,
  LayoutDashboard,
  LogIn,
  LogOut,
  Mail,
  Menu,
  Plus,
  ReceiptText,
  Send,
  ShieldCheck,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import "./styles.css";

const API_BASE = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");
const api = async (path, options = {}) => {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
};
const logout = async (role = null) => {
  await api("/auth/logout", { method: "POST" }).catch(() => {});
  const r = role || window.__smbcLastRole || null;
  window.location.href = r === "admin" ? "/admin/login" : "/login";
};
const yen = (value) => `$${Number(value || 0).toLocaleString("en-US")}`;
const initials = (name) =>
  (name || "KY")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const translations = {
  "ADMIN PORTAL": "管理ポータル",
  "PERSONAL BANKING": "個人バンキング",
  Dashboard: "ダッシュボード",
  Customers: "顧客管理",
  Accounts: "口座",
  Transactions: "取引履歴",
  Transfers: "振込",
  Notifications: "通知",
  Settings: "設定",
  Profile: "プロフィール",
  "Audit log": "監査ログ",
  "Secure connection": "安全な接続",
  Email: "メールアドレス",
  Password: "パスワード",
  "Admin Portal": "管理ポータル",
  "Customer Portal": "顧客ポータル",
  "Sign in": "ログイン",
  "Signing in...": "ログイン中...",
  "Register for online banking": "オンラインバンキング登録",
  "SMBC OPERATIONS": "CITI 運用管理",
  "WORKSPACE": "ワークスペース",
  "Operations dashboard": "運用ダッシュボード",
  "Customers": "顧客数",
  "Active accounts": "有効な口座",
  "Pending transfers": "保留中の振込",
  "Completed transfers": "完了した振込",
  "Recent transactions": "最近の取引",
  "Manage customers": "顧客を管理",
  "Review pending transfers": "保留中の振込を確認",
  "TOTAL BALANCE": "総残高",
  "QUICK ACTIONS": "クイックアクション",
  "YOUR ACCOUNTS": "お客様の口座",
  "NOTIFICATIONS": "通知",
  "Latest": "最新",
  "ACTIVITY": "取引状況",
  "Accounts": "口座",
  "View all": "すべて見る",
  "View all transactions": "すべての取引を見る",
  "Completed": "完了",
  "PROCESSING": "処理中",
  "VERIFICATION_REQUIRED": "認証が必要",
  "LOCKED": "ロック中",
  "PENDING": "保留中",
  "COMPLETED": "完了",
  "Transfer": "振込",
  "Transfer money": "振込を行う",
  "Transaction history": "取引履歴",
  "Recent activity": "最近の活動",
  "Manage your portal preferences.": "ポータル設定を管理します。",
  "Your registered customer information.": "登録されている顧客情報です。",
};
function useLanguage() {
  const [language, setLanguage] = useState(
    localStorage.getItem("smbc-language") ||
      (navigator.language.toLowerCase().startsWith("ja") ? "ja" : "en"),
  );
  useEffect(() => {
    const update = () => setLanguage(localStorage.getItem("smbc-language") || "en");
    window.addEventListener("smbc-language-change", update);
    return () => window.removeEventListener("smbc-language-change", update);
  }, []);
  return { language, t: (value) => language === "ja" ? translations[value] || value : value };
}

function LanguageSwitcher() {
  const { language } = useLanguage();
  const change = (value) => {
    localStorage.setItem("smbc-language", value);
    document.documentElement.lang = value;
    window.dispatchEvent(new Event("smbc-language-change"));
  };
  return (
    <div className="language-switcher">
      <button
        className={language === "en" ? "selected" : ""}
        onClick={() => change("en")}
      >
        EN
      </button>
      <span>|</span>
      <button
        className={language === "ja" ? "selected" : ""}
        onClick={() => change("ja")}
      >
        日本語
      </button>
    </div>
  );
}
function Brand({ admin = false }) {
  return (
    <a className="brand" href={admin ? "/admin/dashboard" : "/dashboard"}>
      <img className="brand-logo" src="/citi-logo.png" alt="Citibank" />
    </a>
  );
}
function Header({ user, admin = false, onLogout }) {
  return (
    <header className="top-header">
      <div className="header-inner">
        <Brand admin={admin} />
        <div className="header-tools">
          <LanguageSwitcher />
          <a className="header-icon" href={admin ? "/admin/notifications" : "/notifications"} aria-label="Notifications">
            <Bell size={18} />
          </a>
          <span className="avatar small">{initials(user?.name)}</span>
          <span className="header-name">{user?.name}</span>
          <button
            className="header-icon"
            onClick={onLogout}
            aria-label="Log out"
          >
            <LogOut size={17} />
          </button>
        </div>
      </div>
    </header>
  );
}
function Notice({ error, success }) {
  if (!error && !success) return null;
  return (
    <div className={`flash ${error ? "error" : "success"}`}>
      {error || success}
    </div>
  );
}
function Shell({ children, user, admin, onLogout = logout, active, setActive }) {
  const { t } = useLanguage();
  const adminItems = [
    ["Dashboard", "/admin/dashboard", LayoutDashboard],
    ["Customers", "/admin/customers", Users],
    ["Accounts", "/admin/accounts", WalletCards],
    ["Transactions", "/admin/transactions", ReceiptText],
    ["Transfers", "/admin/transfers", ArrowLeftRight],
    ["Verification", "/admin/verification", ShieldCheck],
    ["Notifications", "/admin/notifications", Bell],
    ["Administrators", "/admin/admins", ShieldCheck],
    ["Audit log", "/admin/audit-log", FileText],
    ["Settings", "/admin/settings", ShieldCheck],
  ];
  const customerItems = [
    ["Dashboard", "/dashboard", LayoutDashboard],
    ["Accounts", "/accounts", WalletCards],
    ["Transactions", "/transactions", ReceiptText],
    ["Transfers", "/transfers", ArrowLeftRight],
    ["Notifications", "/notifications", Bell],
    ["Profile", "/profile", Users],
    ["Settings", "/settings", ShieldCheck],
  ];
  const items = admin ? adminItems : customerItems;
  return (
    <div className="app-shell">
      <Header user={user} admin={admin} onLogout={onLogout} />
      <div className="portal-frame">
        <aside className="side-nav">
          <div className="side-label">
            {t(admin ? "ADMIN PORTAL" : "PERSONAL BANKING")}
          </div>
          {items.map(([label, href, Icon]) => (
            <a
              key={href}
              className={active === href ? "nav-item active" : "nav-item"}
              href={href}
              onClick={() => setActive(href)}
            >
              <Icon size={18} />
              <span>{t(label)}</span>
              {active === href && <span className="nav-active-line" />}
            </a>
          ))}
          <div className="nav-footer">
            <div className="secure-note">
              <ShieldCheck size={17} /> {t("Secure connection")}
            </div>
            <small>Fictional learning environment</small>
          </div>
        </aside>
        <main className="main-content">{children}</main>
      </div>
    </div>
  );
}
function Login({ admin = false }) {
  const { t, language } = useLanguage();
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api(`/auth/${admin ? "admin" : "customer"}/login`, {
        method: "POST",
        body: JSON.stringify(form),
      });
      window.location.href = admin ? "/admin/dashboard" : "/dashboard";
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="login-page">
      <div className="login-panel">
        <Brand admin={admin} />
        <div className="login-heading">
          <span className="section-kicker">
            {admin ? (language === "ja" ? "管理者アクセス" : "OPERATIONS ACCESS") : t("PERSONAL BANKING")}
          </span>
          <h1>{admin ? t("Admin Portal") : language === "ja" ? "SMBCへようこそ" : "Welcome to Citibank"}</h1>
          <p>
            {admin
              ? language === "ja" ? "顧客、口座、振込を管理するにはログインしてください。" : "Sign in to manage customers, accounts and transfers."
              : language === "ja" ? "安全に口座を管理するにはログインしてください。" : "Sign in to securely manage your accounts."}
          </p>
        </div>
        <Notice error={error} />
        <form onSubmit={submit} className="form-stack">
          <label>
            {t("Email")}
            <input
              type="email"
              required
              value={form.email}
              onChange={(event) =>
                setForm({ ...form, email: event.target.value })
              }
            />
          </label>
          <label>
            {t("Password")}
            <span className="password-field">
              <input
                type={passwordVisible ? "text" : "password"}
                required={admin}
                value={form.password}
                onChange={(event) =>
                  setForm({ ...form, password: event.target.value })
                }
              />
              <button
                type="button"
                className="password-toggle"
                aria-label={passwordVisible ? (language === "ja" ? "パスワードを隠す" : "Hide password") : (language === "ja" ? "パスワードを表示" : "Show password")}
                onClick={() => setPasswordVisible(!passwordVisible)}
              >
                {passwordVisible ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </span>
          </label>
          <button className="primary-button" disabled={loading}>
            {loading ? t("Signing in...") : t("Sign in")} <LogIn size={16} />
          </button>
        </form>
        {!admin && (
          <p className="login-help">
            Development access codes are listed in README.md.
          </p>
        )}
        {admin && (
          <a className="portal-link" href="/login">
            {t("Customer Portal")} <ChevronRight size={15} />
          </a>
        )}
        {!admin && (
          <a className="portal-link register-link" href="/register">
            {t("Register for online banking")} <ChevronRight size={15} />
          </a>
        )}
      </div>
    </div>
  );
}
function ForgotAccessCode() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await api("/auth/customer/forgot-access-code", { method: "POST", body: JSON.stringify({ email }) });
      setMessage(result.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  return <div className="login-page"><div className="login-panel"><Brand /><div className="login-heading"><span className="section-kicker">PERSONAL BANKING</span><h1>Recover access code</h1><p>Enter your email to request secure recovery instructions.</p></div><Notice error={error} success={message} /><form onSubmit={submit} className="form-stack"><label>Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label><button className="primary-button" disabled={loading}>{loading ? "Sending..." : "Send instructions"} <ChevronRight size={16} /></button></form><a className="portal-link" href="/login">Back to sign in <ChevronRight size={15} /></a></div></div>;
}
function Register() {
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", password: "", confirmPassword: "" });
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (form.password !== form.confirmPassword) throw new Error("Passwords do not match");
      if (form.password.length < 8) throw new Error("Password must be at least 8 characters");
      setResult(await api("/auth/customer/register", { method: "POST", body: JSON.stringify(form) }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="login-page"><div className="login-panel"><Brand />
      {!result ? <>
        <div className="login-heading"><span className="section-kicker">PERSONAL BANKING</span><h1>Register for online banking</h1><p>Create your customer profile to get started.</p></div>
        <Notice error={error} />
        <form onSubmit={submit} className="form-stack">
          <label>Full name<input required value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} /></label>
          <label>Email<input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
          <label>Phone<input required type="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
          <label>Password<input required minLength="8" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>
          <label>Confirm password<input required minLength="8" type="password" value={form.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} /></label>
          <button className="primary-button" disabled={loading}>{loading ? "Creating profile..." : "Register"} <ChevronRight size={16} /></button>
        </form>
      </> : <>
        <div className="login-heading"><span className="section-kicker">REGISTRATION COMPLETE</span><h1>Welcome, {result.fullName}</h1><p>Your customer profile has been created.</p></div>
        <div className="access-code-result"><span>Password created</span><strong>Ready</strong><small>Use your email and password to sign in to your customer portal.</small></div>
        <a className="primary-button" href="/login">Continue to sign in <LogIn size={16} /></a>
      </>}
      <a className="portal-link" href="/login">Back to sign in <ChevronRight size={15} /></a>
    </div></div>
  );
}
function PageTitle({ kicker, title, subtitle, action }) {
  const { t } = useLanguage();
  return (
    <div className="page-title">
      <div>
        <span className="section-kicker">{t(kicker)}</span>
        <h1>{t(title)}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
function AdminDashboard({ user }) {
  const { t, language } = useLanguage();
  const [stats, setStats] = useState(null);
  useEffect(() => {
    api("/admin/stats").then(setStats);
  }, []);
  return (
    <Shell user={user} admin active="/admin/dashboard" setActive={() => {}}>
      <PageTitle
        kicker="CITI OPERATIONS"
        title={language === "ja" ? "運用ダッシュボード" : "Operations dashboard"}
        subtitle={language === "ja" ? "共有データベースの最新概要。" : "Live overview from the shared banking database."}
      />
      <div className="stat-grid">
        {[
          ["Customers", stats?.customers, Users],
          ["Active accounts", stats?.accounts, WalletCards],
          ["Pending transfers", stats?.pendingTransfers, ArrowLeftRight],
          ["Completed transfers", stats?.completedTransfers, CircleCheck],
          ["Transactions", stats?.transactions, ReceiptText],
        ].map(([label, value, Icon]) => (
          <article className="stat-card" key={label}>
            <Icon size={19} />
            <span>{label}</span>
            <strong>{value ?? "—"}</strong>
          </article>
        ))}
      </div>
      <div className="panel two-column">
        <div>
          <span className="section-kicker">WORKSPACE</span>
          <h2>{language === "ja" ? "SMBCを管理" : "Manage Citibank"}</h2>
          <p>
            Customers, accounts, incoming funds and verification are linked
            through one persistent data store.
          </p>
        </div>
        <div className="action-list">
          <a href="/admin/customers">
            <Users size={17} /> Manage customers <ChevronRight size={15} />
          </a>
          <a href="/admin/transfers">
            <ArrowLeftRight size={17} /> Review pending transfers{" "}
            <ChevronRight size={15} />
          </a>
        </div>
      </div>
    </Shell>
  );
}
function CustomerDashboard({ user }) {
  const { t, language } = useLanguage();
  const [data, setData] = useState(null);
  useEffect(() => {
    api("/customer/dashboard").then(setData);
  }, []);
  return (
    <Shell user={user} active="/dashboard" setActive={() => {}}>
      <PageTitle
        kicker="PERSONAL BANKING"
        title={`Welcome back, ${data?.user?.fullName?.split(" ")[0] || user.name.split(" ")[0]}`}
        subtitle={language === "ja" ? "現在の金融概要です。" : "Your current financial overview."}
        action={
          <a className="primary-button compact" href="/transfers/new">
            <Send size={16} /> {t("Transfer money")}
          </a>
        }
      />
      <BankPromoSlider />
      <div className="summary-grid">
        <article className="balance-panel">
          <span className="section-kicker">{t("TOTAL BALANCE")}</span>
          <strong>{data ? yen(data.totalBalance) : "—"}</strong>
          <p>{language === "ja" ? "すべての有効な口座の利用可能残高" : "Available across all active accounts"}</p>
        </article>
        <article className="panel quick-panel">
          <span className="section-kicker">{t("QUICK ACTIONS")}</span>
          <div className="action-list">
            <a href="/accounts">
              <WalletCards size={17} /> {language === "ja" ? "口座を見る" : "View accounts"} <ChevronRight size={15} />
            </a>
            <a href="/transactions">
              <ReceiptText size={17} /> {t("Transactions")} {" "}
              <ChevronRight size={15} />
            </a>
          </div>
        </article>
      </div>
      <div className="content-grid">
        <section className="panel">
          <PanelHeading
            kicker="YOUR ACCOUNTS"
            title="Accounts"
            link="/accounts"
          />
          {data?.accounts.map((account) => (
            <a className="account-row" href={`/accounts/${account.id}`} key={account.id}>
              <div className="account-icon">
                <WalletCards size={18} />
              </div>
              <div className="account-info">
                <b>{account.name}</b>
                <span>
                  {account.maskedNumber} · {account.currency}
                </span>
              </div>
              <strong>{yen(account.balance)}</strong>
              <ChevronRight size={16} />
            </a>
          ))}
        </section>
        <section className="panel">
          <PanelHeading
            kicker="NOTIFICATIONS"
            title="Latest"
            link="/notifications"
          />
          {data?.notifications.slice(0, 3).map((item) => (
            <div className="notification-row" key={item.id}>
              <Bell size={15} />
              <div>
                <b>{item.title}</b>
                <span>{item.body}</span>
              </div>
            </div>
          ))}
        </section>
      </div>
      <section className="panel">
        <PanelHeading
          kicker="ACTIVITY"
          title="Recent transactions"
          link="/transactions"
        />
        {data?.transactions.slice(0, 5).map((transaction) => (
          <TransactionRow transaction={transaction} key={transaction.id} />
        ))}
      </section>
    </Shell>
  );
}
function PanelHeading({ kicker, title, link }) {
  const { t } = useLanguage();
  return (
    <div className="panel-title-row">
      <div>
        <span className="section-kicker">{t(kicker)}</span>
        <h2>{t(title)}</h2>
      </div>
      {link && (
        <a className="text-button" href={link}>
          {t("View all")} <ChevronRight size={14} />
        </a>
      )}
    </div>
  );
}
function TransactionRow({ transaction }) {
  const { t } = useLanguage();
  return (
    <div className="transaction-row">
      <span>{new Date(transaction.createdAt).toLocaleDateString()}</span>
      <div>
        <b>{transaction.description}</b>
        <small>{transaction.senderName || transaction.currency}</small>
      </div>
      <strong className={transaction.amount >= 0 ? "credit" : "debit"}>
        {transaction.amount >= 0 ? "+" : ""}
        {yen(transaction.amount)}
      </strong>
      <span className="status-badge">{t(transaction.status)}</span>
    </div>
  );
}
function AdminCustomers({ user }) {
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    status: "ACTIVE",
  });
  const [message, setMessage] = useState("");
  const load = () => api("/admin/customers").then(setCustomers);
  useEffect(() => { load() }, []);
  const create = async (event) => {
    event.preventDefault();
    try {
      await api("/admin/customers", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setForm({ fullName: "", email: "", phone: "", status: "ACTIVE" });
      setMessage("Customer created successfully.");
      load();
    } catch (err) {
      setMessage(err.message);
    }
  };
  const accessCode = async (id) => {
    const result = await api(`/admin/customers/${id}/access-code`, {
      method: "POST",
    });
    setMessage(`Access code generated: ${result.accessCode}`);
    load();
  };
  return (
    <Shell user={user} admin active="/admin/customers" setActive={() => {}}>
      <PageTitle
        kicker="CUSTOMER MANAGEMENT"
        title="Customers"
        subtitle="Create and manage customer records."
      />
      <div className="panel form-panel">
        <span className="section-kicker">CREATE CUSTOMER</span>
        <form className="inline-form" onSubmit={create}>
          {["fullName", "email", "phone"].map((field) => (
            <input
              key={field}
              required={field !== "phone"}
              placeholder={
                field === "fullName"
                  ? "Full name"
                  : field[0].toUpperCase() + field.slice(1)
              }
              type={field === "email" ? "email" : "text"}
              value={form[field]}
              onChange={(event) =>
                setForm({ ...form, [field]: event.target.value })
              }
            />
          ))}
          <button className="primary-button">
            Create customer <Plus size={16} />
          </button>
        </form>
        <Notice success={message} />
      </div>
      <section className="panel">
        <PanelHeading kicker="DATABASE RECORDS" title="Customer list" />
        {customers.map((customer) => (
          <div className="customer-row" key={customer.id}>
            <div className="avatar">{initials(customer.fullName)}</div>
            <div className="account-info">
              <b>{customer.fullName}</b>
              <span>
                {customer.email} · {customer.accounts.length} account(s)
              </span>
            </div>
            <span
              className={`status-badge ${customer.status !== "ACTIVE" ? "warning" : ""}`}
            >
              {customer.status}
            </span>
            <strong>{yen(customer.balance)}</strong>
            <a
              className="secondary-button"
              href={`/admin/customers/${customer.id}`}
            >
              View
            </a>
            <button
              className="secondary-button"
              onClick={() => accessCode(customer.id)}
            >
              Generate access code
            </button>
          </div>
        ))}
      </section>
    </Shell>
  );
}
function AdminTransfers({ user }) {
  const [transfers, setTransfers] = useState([]);
  useEffect(() => {
    api("/admin/transfers").then(setTransfers);
  }, []);
  return (
    <Shell user={user} admin active="/admin/transfers" setActive={() => {}}>
      <PageTitle
        kicker="TRANSFER CONTROL"
        title="Transfers"
        subtitle="Review customer transfers and unlock verification stages."
      />
      <section className="panel">
        <PanelHeading kicker="LIVE QUEUE" title="Transfer records" />
        {transfers.map((transfer) => (
          <div className="customer-row" key={transfer.id}>
            <div>
              <b>{transfer.reference}</b>
              <span>
                {transfer.recipientName} ·{" "}
                {new Date(transfer.createdAt).toLocaleString()}
              </span>
            </div>
            <div className="account-info">
              <b>{yen(transfer.amount)}</b>
              <span>
                {transfer.status} · Stage {Math.min(transfer.currentStage, 4)}{" "}
                of 4
              </span>
            </div>
            <span className="status-badge">{transfer.status}</span>
            <a
              className="secondary-button"
              href={`/admin/transfers/${transfer.id}`}
            >
              View
            </a>
          </div>
        ))}
      </section>
    </Shell>
  );
}
function TransferDetail({ user, id }) {
  const [transfer, setTransfer] = useState(null);
  const [message, setMessage] = useState("");
  const load = () => api(`/admin/transfers/${id}`).then(setTransfer);
  useEffect(() => { load() }, []);
  const generate = async (stage) => {
    try {
      const result = await api(`/admin/transfers/${id}/code`, {
        method: "POST",
        body: JSON.stringify({ stage }),
      });
      setMessage(
        `Stage ${stage} code generated: ${result.code}. Send the notification now.`,
      );
      load();
    } catch (err) {
      setMessage(err.message);
    }
  };
  const notify = async (stage) => {
    try {
      await api(`/admin/transfers/${id}/notify`, {
        method: "POST",
        body: JSON.stringify({ stage }),
      });
      setMessage(`Stage ${stage} notification sent to the customer.`);
      load();
    } catch (err) {
      setMessage(err.message);
    }
  };
  return (
    <Shell user={user} admin active="/admin/transfers" setActive={() => {}}>
      <PageTitle
        kicker="TRANSFER DETAIL"
        title={transfer?.reference || "Transfer"}
        subtitle="Control the fictional four-stage verification workflow."
      />
      <Notice success={message} />
      <section className="panel detail-grid">
        <div>
          <span className="section-kicker">TRANSFER</span>
          <h2>{transfer?.recipientName}</h2>
          <p>
            {transfer?.bankName} · {transfer?.recipientAccount}
          </p>
          <strong className="detail-amount">
            {transfer && yen(transfer.amount)}
          </strong>
        </div>
        <div>
          <span className="section-kicker">STATUS</span>
          <p className="detail-status">{transfer?.status}</p>
          <p>Current stage: {Math.min(transfer?.currentStage || 1, 4)} of 4</p>
        </div>
      </section>
      <section className="stage-grid">
        {[
          { stage: 1, name: "Flat Fee", desc: "Fixed price per transaction" },
          { stage: 2, name: "Percentage Fee", desc: "Share of total amount" },
          { stage: 3, name: "Bank vs. App", desc: "Compare fee structures" },
          { stage: 4, name: "Tiered Bracket", desc: "Bracketed price bands" },
        ].map(({ stage, name, desc }) => {
          const item = transfer?.verificationCodes?.find(
            (codeItem) => codeItem.stage === stage,
          );
          const available =
            transfer &&
            stage === transfer.currentStage &&
            transfer.status !== "COMPLETED";
          return (
            <article
              className={`stage-card ${available ? "available" : ""}`}
              key={stage}
            >
              <span className="stage-number">0{stage}</span>
              <h2>{name}</h2>
              <p>{desc}</p>
              {available && (
                <>
                  {!item ? (
                    <button
                      className="primary-button"
                      onClick={() => generate(stage)}
                    >
                      Generate code
                    </button>
                  ) : (
                    <button
                      className="secondary-button"
                      onClick={() => notify(stage)}
                    >
                      Send notification
                    </button>
                  )}
                </>
              )}
            </article>
          );
        })}
      </section>
    </Shell>
  );
}
function TransferNew({ user }) {
  const [data, setData] = useState(null);
  const [form, setForm] = useState({
    accountId: "",
    recipientName: "",
    bankName: "Hikari Regional Bank",
    recipientAccount: "",
    amount: "",
    currency: "USD",
    message: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    api("/customer/dashboard").then((result) => {
      setData(result);
      setForm((current) => ({
        ...current,
        accountId: result.accounts[0]?.id || "",
      }));
    });
  }, []);
  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const transfer = await api("/customer/transfers", {
        method: "POST",
        body: JSON.stringify({ ...form, amount: Number(form.amount) }),
      });
      window.location.href = `/transfers/${transfer.id}`;
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <Shell user={user} active="/transfers" setActive={() => {}}>
      <PageTitle
        kicker="TRANSFER MONEY"
        title="New transfer"
        subtitle="Send fictional funds to a recipient in Japan."
      />
      <Notice error={error} />
      <form className="panel form-stack wide-form" onSubmit={submit}>
        <label>
          From account
          <select
            required
            value={form.accountId}
            onChange={(event) =>
              setForm({ ...form, accountId: event.target.value })
            }
          >
            {data?.accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name} · {yen(account.balance)}
              </option>
            ))}
          </select>
        </label>
        <div className="form-grid">
          <label>
            Recipient name
            <input
              required
              value={form.recipientName}
              onChange={(event) =>
                setForm({ ...form, recipientName: event.target.value })
              }
            />
          </label>
          <label>
            Bank
            <input
              required
              value={form.bankName}
              onChange={(event) =>
                setForm({ ...form, bankName: event.target.value })
              }
            />
          </label>
          <label>
            Account number
            <input
              required
              value={form.recipientAccount}
              onChange={(event) =>
                setForm({ ...form, recipientAccount: event.target.value })
              }
            />
          </label>
          <label>
            Amount (USD)
            <input
              required
              min="1"
              type="number"
              value={form.amount}
              onChange={(event) =>
                setForm({ ...form, amount: event.target.value })
              }
            />
          </label>
        </div>
        <label>
          Message (optional)
          <textarea
            value={form.message}
            onChange={(event) =>
              setForm({ ...form, message: event.target.value })
            }
          />
        </label>
        <button className="primary-button" disabled={loading}>
          {loading ? "Creating transfer..." : "Review and send"}{" "}
          <ChevronRight size={16} />
        </button>
      </form>
    </Shell>
  );
}
function TransferProcess({ user, id }) {
  const [transfer, setTransfer] = useState(null);
  useEffect(() => {
    api(`/customer/transfers/${id}`).then(setTransfer);
  }, [id]);
  const stages = transfer?.currentStage || 1;
  const stageNames = { 1: "Flat Fee", 2: "Percentage Fee", 3: "Bank vs. App", 4: "Tiered Bracket Fee" };
  const stagePercent = { 1: 25, 2: 50, 3: 75, 4: 100 };
  return (
    <Shell user={user} active="/transfers" setActive={() => {}}>
      <PageTitle
        kicker="TRANSFER STATUS"
        title={
          transfer?.status === "COMPLETED"
            ? "Payment Successful"
            : stageNames[stages] || "Verification required"
        }
        subtitle={
          transfer?.status === "COMPLETED"
            ? "Your transfer has been completed successfully."
            : `Stage ${stages} of 4 — ${stageNames[stages]}`
        }
      />
      <section className="panel processing-panel">
        <CircleCheck
          size={52}
          className={
            transfer?.status === "COMPLETED" ? "green-icon" : "blue-icon"
          }
        />
        <h2>
          {transfer?.status === "COMPLETED"
            ? "Payment Successful"
            : "Processing transfer"}
        </h2>
        <p>
          {transfer?.recipientName} · {transfer?.bankName}
        </p>
        {transfer?.status === "COMPLETED" ? (
          <>
            <div className="success-amount">{yen(transfer.amount)}</div>
            <div className="completion-reference">
              Reference: {transfer.reference}
            </div>
            <a className="primary-button" href="/dashboard" style={{ marginTop: 16 }}>
              Back to Dashboard
            </a>
          </>
        ) : (
          <>
            <div className="progress-track">
              <span style={{ width: `${stagePercent[stages]}%` }} />
            </div>
            <b>{stagePercent[stages]}%</b>
            <a className="primary-button" href={`/transfers/${id}/verify`}>
              Continue to {stageNames[stages]}
            </a>
          </>
        )}
      </section>
    </Shell>
  );
}
function Verify({ user, id }) {
  const [transfer, setTransfer] = useState(null);
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const load = () => api(`/customer/transfers/${id}`).then(setTransfer);
  useEffect(() => { load() }, []);
  const submit = async (event) => {
    event.preventDefault();
    try {
      const result = await api(`/customer/transfers/${id}/verify`, {
        method: "POST",
        body: JSON.stringify({ stage: transfer.currentStage, code: value }),
      });
      if (result.status === "COMPLETED")
        window.location.href = `/transfers/${id}`;
      else {
        setValue("");
        load();
      }
    } catch (err) {
      setError(err.message);
    }
  };
  const stageNames = {
    1: "Flat Fee",
    2: "Percentage Fee",
    3: "Bank vs. App",
    4: "Tiered Bracket Fee",
  };
  const stageDescriptions = {
    1: "This stage covers the applicable flat fee for your transfer. Contact your accountant for guidance on the exact amount.",
    2: "This stage covers the applicable percentage-based fee for your transfer. Contact your accountant for guidance on the exact amount.",
    3: "This stage covers the applicable transfer fee. Contact your accountant for guidance on the exact amount.",
    4: "This stage covers the applicable tiered fee for your transfer. Contact your accountant for guidance on the exact amount.",
  };
  const stagePercent = { 1: 25, 2: 50, 3: 75, 4: 100 };
  return (
    <Shell user={user} active="/transfers" setActive={() => {}}>
      <PageTitle
        kicker="TRANSFER FEE VERIFICATION"
        title={stageNames[transfer?.currentStage || 1]}
        subtitle={stageDescriptions[transfer?.currentStage || 1]}
      />
      <div className="verification-dots">
        {[1, 2, 3, 4].map((stage) => (
          <span
            className={
              stage < (transfer?.currentStage || 1)
                ? "done"
                : stage === transfer?.currentStage
                  ? "current"
                  : ""
            }
            key={stage}
          />
        ))}
      </div>
      <form className="panel verification-panel" onSubmit={submit}>
        <div className="verify-stage-header">
          <span className="verify-stage-badge">Stage {transfer?.currentStage || 1} of 4</span>
          <span className="verify-stage-percent">{stagePercent[transfer?.currentStage || 1]}%</span>
        </div>
        <div className="verify-progress">
          <div className="verify-progress-bar" style={{ width: `${stagePercent[transfer?.currentStage || 1]}%` }} />
        </div>
        <ShieldCheck size={34} className="green-icon" />
        <h2>{stageNames[transfer?.currentStage || 1]}</h2>
        <p>{stageDescriptions[transfer?.currentStage || 1]}</p>
        <Notice error={error} />
        <div className="verify-input-group">
          <label>Enter verification code</label>
          <input
            className="code-input"
            required
            inputMode="numeric"
            maxLength="6"
            value={value}
            onChange={(event) => setValue(event.target.value.replace(/\D/g, ""))}
            placeholder="000000"
          />
          <small>A verification code has been sent to you. Contact your accountant if you need assistance.</small>
        </div>
        <button className="primary-button" type="submit">
          Continue <ChevronRight size={16} />
        </button>
      </form>
    </Shell>
  );
}
function Notifications({ user }) {
  const [items, setItems] = useState([]);
  useEffect(() => {
    api("/customer/notifications").then(setItems);
  }, []);
  return (
    <Shell user={user} active="/notifications" setActive={() => {}}>
      <PageTitle
        kicker="PERSONAL BANKING"
        title="Notifications"
        subtitle="Messages and fictional application verification codes."
      />
      <section className="panel">
        {items.map((item) => (
          <div className="notification-row large" key={item.id}>
            <Bell size={17} />
            <div>
              <b>{item.title}</b>
              <span>{item.body}</span>
              <small>{new Date(item.createdAt).toLocaleString()}</small>
            </div>
          </div>
        ))}
      </section>
    </Shell>
  );
}
function DataListPage({ user, admin, title, kicker, subtitle, active, items, children }) {
  return <Shell user={user} admin={admin} active={active} setActive={() => {}}><PageTitle kicker={kicker} title={title} subtitle={subtitle} />{children || <section className="panel">{items?.map(item => <div className="customer-row" key={item.id}><div className="account-info"><b>{item.name || item.description || item.reference}</b><span>{item.customer || item.detail || item.email || item.status}</span></div>{item.balance !== undefined && <strong>{yen(item.balance)}</strong>}{item.amount !== undefined && <strong className={item.amount >= 0 ? 'credit' : 'debit'}>{item.amount >= 0 ? '+' : ''}{yen(item.amount)}</strong>}{item.status && <span className="status-badge">{item.status}</span>}</div>)}</section>}</Shell>;
}
function CustomerAccounts({ user }) { const [data, setData] = useState(null); useEffect(() => { api('/customer/dashboard').then(setData) }, []); return <Shell user={user} active="/accounts" setActive={() => {}}><PageTitle kicker="PERSONAL BANKING" title="Accounts" subtitle="Review your accounts and available balances." /><section className="panel">{data?.accounts.map(account => <a className="account-row" href={`/accounts/${account.id}`} key={account.id}><div className="account-info"><b>{account.name}</b><span>{account.maskedNumber} · {account.currency}</span></div><strong>{yen(account.balance)}</strong><ChevronRight size={16} /></a>)}</section></Shell> }
function CustomerTransactions({ user }) { const [data, setData] = useState(null); useEffect(() => { api('/customer/dashboard').then(setData) }, []); return <Shell user={user} active="/transactions" setActive={() => {}}><PageTitle kicker="PERSONAL BANKING" title="Transactions" subtitle="Your complete transaction history." /><section className="panel"><PanelHeading kicker="ACTIVITY" title="Transaction history" />{data?.transactions.map(transaction => <TransactionRow transaction={transaction} key={transaction.id} />)}</section></Shell> }
function CustomerTransfers({ user }) { const [data, setData] = useState(null); useEffect(() => { api('/customer/dashboard').then(setData) }, []); return <Shell user={user} active="/transfers" setActive={() => {}}><PageTitle kicker="PERSONAL BANKING" title="Transfers" subtitle="Create and track your transfers." action={<a className="primary-button compact" href="/transfers/new"><Send size={16} /> New transfer</a>} /><section className="panel">{data?.transfers?.map(item => <div className="customer-row" key={item.id}><div className="account-info"><b>{item.reference}</b><span>{item.recipientName} · {item.status}</span></div><strong>{yen(item.amount)}</strong><a className="secondary-button" href={`/transfers/${item.id}`}>View</a></div>)}</section></Shell> }
function CustomerProfile({ user }) { return <Shell user={user} active="/profile" setActive={() => {}}><PageTitle kicker="PERSONAL BANKING" title="Profile" subtitle="Your registered customer information." /><section className="panel form-stack profile-card"><div className="avatar">{initials(user.name)}</div><label>Full name<input readOnly value={user.name} /></label><label>Account role<input readOnly value="Customer" /></label><p>For profile changes, contact Citibank support.</p></section></Shell> }
function SettingsPage({ user, admin = false }) { return <Shell user={user} admin={admin} active={admin ? '/admin/settings' : '/settings'} setActive={() => {}}><PageTitle kicker={admin ? 'CITI OPERATIONS' : 'PERSONAL BANKING'} title="Settings" subtitle="Manage your portal preferences." /><section className="panel form-stack"><label>Language<select defaultValue={localStorage.getItem('smbc-language') || 'en'} onChange={event => { localStorage.setItem('smbc-language', event.target.value); document.documentElement.lang = event.target.value; window.dispatchEvent(new Event('smbc-language-change')) }}><option value="en">English</option><option value="ja">日本語</option></select></label><label>Security status<input readOnly value="Secure connection enabled" /></label></section></Shell> }
function AdminAccounts({ user }) {
  const [customers, setCustomers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState({ userId: "", name: "", type: "PERSONAL", currency: "USD", openingBalance: "", fullName: "", email: "", phone: "", password: "" });
  const [message, setMessage] = useState("");
  const [addBalanceAccountId, setAddBalanceAccountId] = useState(null);
  const [addBalanceAmount, setAddBalanceAmount] = useState("");
  const [addBalanceDesc, setAddBalanceDesc] = useState("");
  const load = () => api("/admin/accounts").then(setAccounts);
  useEffect(() => { load(); api("/admin/customers").then(setCustomers) }, []);
  const create = async (event) => {
    event.preventDefault();
    try {
      let userId = form.userId;
      if (!userId && form.email && form.password) {
        const customer = await api("/admin/customers", {
          method: "POST",
          body: JSON.stringify({
            fullName: form.fullName || form.email.split("@")[0],
            email: form.email,
            phone: form.phone || "",
            password: form.password,
          }),
        });
        userId = customer.id;
        await api("/admin/customers").then(setCustomers);
      }
      if (!userId) { setMessage("Select a customer or enter email and password to create one."); return; }
      await api("/admin/accounts", {
        method: "POST",
        body: JSON.stringify({ userId, name: form.name, type: form.type, currency: form.currency, openingBalance: Number(form.openingBalance || 0) }),
      });
      setForm({ userId: "", name: "", type: "PERSONAL", currency: "USD", openingBalance: "", fullName: "", email: "", phone: "", password: "" });
      setMessage("Account created successfully.");
      load();
    } catch (err) { setMessage(err.message); }
  };
  const addBalance = async (accountId) => {
    const amount = Number(addBalanceAmount);
    if (!amount || amount <= 0) { setMessage("Enter a valid amount."); return; }
    try {
      await api("/admin/transactions", {
        method: "POST",
        body: JSON.stringify({
          accountId,
          amount,
          description: addBalanceDesc || "Balance credit",
          senderName: "Citibank",
          currency: "USD",
        }),
      });
      setMessage(`$${amount.toLocaleString()} added successfully.`);
      setAddBalanceAccountId(null);
      setAddBalanceAmount("");
      setAddBalanceDesc("");
      load();
    } catch (err) { setMessage(err.message); }
  };
  return (
    <Shell user={user} admin active="/admin/accounts" setActive={() => {}}>
      <PageTitle kicker="ACCOUNT MANAGEMENT" title="Accounts" subtitle="Create customer accounts and review every account in the shared database." />
      <div className="panel form-panel">
        <span className="section-kicker">CREATE ACCOUNT</span>
        <form className="form-stack" onSubmit={create}>
          <label>Existing customer (optional)
            <select value={form.userId} onChange={(event) => setForm({ ...form, userId: event.target.value })}>
              <option value="">-- Select existing customer or create new below --</option>
              {customers.map(customer => <option key={customer.id} value={customer.id}>{customer.fullName} · {customer.email}</option>)}
            </select>
          </label>
          {!form.userId && (
            <>
              <div className="form-grid">
                <label>Full name
                  <input value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} placeholder="John Doe" />
                </label>
                <label>Email *
                  <input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="john@example.com" />
                </label>
                <label>Phone
                  <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="+1 555 123 4567" />
                </label>
                <label>Password *
                  <input required type="password" minLength="8" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Min 8 characters" />
                </label>
              </div>
              <span className="section-kicker" style={{ marginTop: 8 }}>ACCOUNT DETAILS</span>
            </>
          )}
          <div className="form-grid">
            <label>Account name
              <input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Personal Account" />
            </label>
            <label>Type
              <select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>
                <option value="PERSONAL">Personal</option>
                <option value="SAVINGS">Savings</option>
                <option value="BUSINESS">Business</option>
              </select>
            </label>
            <label>Currency
              <select value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value })}>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </label>
            <label>Opening balance
              <input required type="number" min="0" value={form.openingBalance} onChange={(event) => setForm({ ...form, openingBalance: event.target.value })} placeholder="0" />
            </label>
          </div>
          <button className="primary-button" style={{ alignSelf: "flex-start" }}>
            Create account <Plus size={16} />
          </button>
        </form>
        <Notice success={message} />
      </div>
      <section className="panel">
        <PanelHeading kicker="DATABASE RECORDS" title="Account list" />
        {accounts.map(account => (
          <div key={account.id}>
            <div className="customer-row">
              <div className="account-info">
                <b>{account.name}</b>
                <span>{account.accountNumber} · {account.customer} · {account.email} · {account.currency}</span>
              </div>
              <span className="status-badge">{account.status}</span>
              <strong>{yen(account.balance)}</strong>
              <button
                className="secondary-button"
                onClick={() => setAddBalanceAccountId(addBalanceAccountId === account.id ? null : account.id)}
              >
                Add Balance
              </button>
            </div>
            {addBalanceAccountId === account.id && (
              <div className="add-balance-form">
                <label>
                  Amount
                  <input
                    type="number"
                    min="1"
                    required
                    value={addBalanceAmount}
                    onChange={(e) => setAddBalanceAmount(e.target.value)}
                    placeholder="Enter amount"
                  />
                </label>
                <label>
                  Description
                  <input
                    value={addBalanceDesc}
                    onChange={(e) => setAddBalanceDesc(e.target.value)}
                    placeholder="Balance credit"
                  />
                </label>
                <div className="add-balance-actions">
                  <button className="primary-button" type="button" onClick={() => addBalance(account.id)}>
                    Confirm
                  </button>
                  <button className="secondary-button" type="button" onClick={() => { setAddBalanceAccountId(null); setAddBalanceAmount(""); setAddBalanceDesc(""); }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </section>
    </Shell>
  );
}
function AdminAuditLog({ user }) { const [items, setItems] = useState([]); useEffect(() => { api('/admin/audit-log').then(setItems) }, []); return <DataListPage user={user} admin title="Audit log" kicker="CONTROL RECORDS" subtitle="Administrative actions recorded by the system." active="/admin/audit-log" items={items.map(item => ({ ...item, name: item.action, customer: `${item.entityType} · ${new Date(item.createdAt).toLocaleString()}`, status: 'RECORDED' }))} /> }
function AdminVerification({ user }) { const [items, setItems] = useState([]); useEffect(() => { api('/admin/transfers').then(setItems) }, []); return <DataListPage user={user} admin title="Verification" kicker="APPLICATION CONTROL" subtitle="Monitor the current stage of every transfer." active="/admin/verification" items={items.map(item => ({ ...item, name: item.reference, customer: `${item.recipientName} · Stage ${Math.min(item.currentStage, 4)} of 4`, status: item.status }))} /> }
function CustomerAccountDetail({ user, id }) {
  const [data, setData] = useState(null);
  useEffect(() => { api(`/customer/accounts/${id}`).then(setData) }, [id]);
  return (
    <Shell user={user} active="/accounts" setActive={() => {}}>
      <PageTitle kicker="ACCOUNT DETAIL" title={data?.name || 'Account'} subtitle="Current balance and account information." />
      <section className="panel detail-grid">
        <div><span className="section-kicker">AVAILABLE BALANCE</span><strong className="detail-amount">{data && yen(data.balance)}</strong></div>
        <div><span className="section-kicker">ACCOUNT</span><h2>{data?.maskedNumber}</h2><p>{data?.currency} · {data?.status}</p></div>
      </section>
      <section className="panel transactions-panel">
        <PanelHeading kicker="ACTIVITY" title="Recent transactions" />
        {data?.transactions?.map(t => <TransactionRow transaction={t} key={t.id} />)}
      </section>
    </Shell>
  );
}
function AdminTransactions({ user }) {
  const [accounts, setAccounts] = useState([]);
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ accountId: '', amount: '', description: '', senderName: '', currency: 'USD', date: '' });
  const [message, setMessage] = useState('');
  const load = () => api('/admin/transactions').then(setItems);
  useEffect(() => { load(); api('/admin/accounts').then(setAccounts) }, []);
  const create = async (e) => {
    e.preventDefault();
    try {
      await api('/admin/transactions', { method: 'POST', body: JSON.stringify({ ...form, amount: Number(form.amount) }) });
      setForm({ accountId: '', amount: '', description: '', senderName: '', currency: 'USD', date: '' });
      setMessage('Incoming funds credited successfully.');
      load();
    } catch (err) { setMessage(err.message); }
  };
  return (
    <Shell user={user} admin active="/admin/transactions" setActive={() => {}}>
      <PageTitle kicker="TRANSACTION CONTROL" title="Transactions" subtitle="Credit incoming funds and review all activity." />
      <div className="panel form-panel">
        <PanelHeading kicker="CREDIT FUNDS" title="Add incoming funds" />
        <form className="form-stack" onSubmit={create}>
          <div className="form-grid">
            <label>Account
              <select required value={form.accountId} onChange={e => setForm({ ...form, accountId: e.target.value })}>
                <option value="" disabled>Select an account</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.customer} · {a.name} · {a.accountNumber}</option>)}
              </select>
            </label>
            <label>Amount (USD)
              <input required type="number" min="1" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="100000" />
            </label>
            <label>Description
              <input required value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Incoming Transfer" />
            </label>
            <label>Sender name
              <input value={form.senderName} onChange={e => setForm({ ...form, senderName: e.target.value })} placeholder="Yamato Holdings" />
            </label>
            <label>Currency
              <select value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}>
                <option value="USD">USD</option><option value="USD">USD</option><option value="EUR">EUR</option>
              </select>
            </label>
            <label>Date (optional)
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            </label>
          </div>
          <button className="primary-button" style={{ alignSelf: 'flex-start' }}>
            Credit incoming funds <Plus size={16} />
          </button>
        </form>
        <Notice success={message} />
      </div>
      <section className="panel transactions-panel">
        <PanelHeading kicker="ACTIVITY" title="Recent transactions" />
        {items.map(t => <TransactionRow transaction={t} key={t.id} />)}
      </section>
    </Shell>
  );
}
function AdminNotifications({ user }) {
  const [data, setData] = useState({ emails: [], notifications: [] });
  useEffect(() => { api('/admin/notifications').then(setData) }, []);
  return (
    <Shell user={user} admin active="/admin/notifications" setActive={() => {}}>
      <PageTitle kicker="MESSAGE CENTER" title="Notifications" subtitle="Delivery records and customer-facing messages." />
      <section className="panel">
        <PanelHeading kicker="OUTBOX" title="Sent email records" />
        {data.emails.map(item => (
          <div className="notification-row large" key={item.id}>
            <Mail size={17} />
            <div><b>{item.subject}</b><span>{item.customer}</span><small>{item.body} · {new Date(item.createdAt).toLocaleString()}</small></div>
          </div>
        ))}
      </section>
      <section className="panel transactions-panel">
        <PanelHeading kicker="INBOX" title="Customer notifications" />
        {data.notifications.map(item => (
          <div className="notification-row large" key={item.id}>
            <Bell size={17} />
            <div><b>{item.title}</b><span>{item.customer}</span><small>{item.body} · {new Date(item.createdAt).toLocaleString()}</small></div>
          </div>
        ))}
      </section>
    </Shell>
  );
}
function AdminCustomerDetail({ user, id }) {
  const [customer, setCustomer] = useState(null);
  useEffect(() => { api(`/admin/customers/${id}`).then(setCustomer) }, [id]);
  return (
    <Shell user={user} admin active="/admin/customers" setActive={() => {}}>
      <PageTitle kicker="CUSTOMER DETAIL" title={customer?.fullName || 'Customer'} subtitle="Customer profile and account summary." />
      <section className="panel detail-grid">
        <div><div className="avatar">{initials(customer?.fullName)}</div><h2>{customer?.email}</h2><p>{customer?.status}</p></div>
        <div><span className="section-kicker">TOTAL BALANCE</span><strong className="detail-amount">{customer && yen(customer.balance)}</strong><p>{customer?.accounts?.length || 0} account(s)</p></div>
      </section>
      <section className="panel transactions-panel">
        <PanelHeading kicker="ACCOUNTS" title="Customer accounts" />
        {customer?.accounts?.map(a => (
          <div className="account-row" key={a.id}>
            <div className="account-info"><b>{a.name}</b><span>{a.maskedNumber} · {a.currency}</span></div>
            <strong>{yen(a.balance)}</strong>
          </div>
        ))}
      </section>
      <section className="panel transactions-panel">
        <PanelHeading kicker="ACTIVITY" title="Recent transactions" />
        {customer?.transactions?.map(t => <TransactionRow transaction={t} key={t.id} />)}
      </section>
    </Shell>
  );
}
function AdminManagement({ user }) {
  const [admins, setAdmins] = useState([]);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const load = () => api("/admin/admins").then(setAdmins).catch((err) => setError(err.message));
  useEffect(() => { load(); }, []);
  const create = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      await api("/admin/admins", { method: "POST", body: JSON.stringify(form) });
      setForm({ name: "", email: "", password: "" });
      setMessage("Administrator created successfully.");
      load();
    } catch (err) { setError(err.message); }
  };
  return (
    <Shell user={user} admin active="/admin/admins" setActive={() => {}}>
      <PageTitle kicker="ACCESS CONTROL" title="Administrators" subtitle="Create and review the administrators who can operate this portal." />
      <div className="panel form-panel">
        <span className="section-kicker">CREATE ADMINISTRATOR</span>
        <form className="inline-form" onSubmit={create}>
          <input required placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input required minLength="8" type="password" placeholder="Password (min 8 chars)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <button className="primary-button">Create admin <Plus size={16} /></button>
        </form>
        <Notice success={message} />
        <Notice error={error} />
      </div>
      <section className="panel">
        <PanelHeading kicker="DATABASE RECORDS" title="Administrator list" />
        {admins.map((item) => (
          <div className="customer-row" key={item.id}>
            <div className="avatar">{initials(item.name)}</div>
            <div className="account-info">
              <b>{item.name}</b>
              <span>{item.email}{item.email === user?.email ? " · (you)" : ""}</span>
            </div>
            <span className="status-badge">ACTIVE</span>
          </div>
        ))}
      </section>
    </Shell>
  );
}
function BankPromoSlider() {
  const [index, setIndex] = React.useState(0);
  const slides = [
    { title: "Need Extra Cash?", text: "Apply for an instant loan with low interest rates.", color: "#255BE3" },
    { title: "Upgrade to Platinum Card", text: "Enjoy higher limits and exclusive rewards.", color: "#1A3FA0" },
    { title: "Grow Your Savings", text: "Earn up to 4.5% APY on high-yield accounts.", color: "#255BE3" },
    { title: "Secure Banking", text: "Advanced encryption keeps your money safe.", color: "#1A3FA0" },
  ];
  React.useEffect(() => {
    const timer = setInterval(() => setIndex((prev) => (prev + 1) % slides.length), 4000);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="promo-slider">
      <div className="promo-track" style={{ transform: `translateX(-${index * 100}%)` }}>
        {slides.map((s, i) => (
          <div key={i} className="promo-slide" style={{ background: s.color }}>
            <div className="promo-text">
              <h3>{s.title}</h3>
              <p>{s.text}</p>
              <button className="promo-btn">Learn More</button>
            </div>
            <div className="promo-logo-wrap">
              <img src="/citi-logo.png" alt="Citibank" className="promo-logo" />
            </div>
          </div>
        ))}
      </div>
      <div className="promo-dots">
        {slides.map((_, i) => (
          <span key={i} className={i === index ? "active" : ""} />
        ))}
      </div>
    </div>
  );
}
function Home() {
  return (
    <div className="home-page">
      <header className="home-header">
        <div className="home-header-inner">
          <img src="/citi-logo.png" alt="Citibank" className="home-logo" />
          <div className="home-header-links">
            <a href="/login" className="home-login-btn">Sign In</a>
          </div>
        </div>
      </header>
      <section className="home-hero">
        <div className="home-hero-inner">
          <div className="home-hero-text">
            <h1>Transfer Money Across The World In Real Time</h1>
            <p>Simple, fast and secure transfers — made for individuals and businesses.</p>
            <div className="home-hero-buttons">
              <a href="/login" className="primary-button">Online Access</a>
              <a href="/register" className="secondary-button">Open Account</a>
            </div>
          </div>
          <div className="home-hero-image">
            <img src="/citi-logo.png" alt="Citibank" />
          </div>
        </div>
      </section>
      <div className="home-slider-section">
        <BankPromoSlider />
      </div>
      <section className="home-features">
        <div className="home-features-inner">
          <div className="home-feature">
            <div className="home-feature-icon">🔒</div>
            <h3>Secure Banking</h3>
            <p>Advanced encryption keeps your money safe 24/7.</p>
          </div>
          <div className="home-feature">
            <div className="home-feature-icon">⚡</div>
            <h3>Instant Transfers</h3>
            <p>Send money in real time to anyone, anywhere.</p>
          </div>
          <div className="home-feature">
            <div className="home-feature-icon">💳</div>
            <h3>Global Access</h3>
            <p>Manage your accounts from anywhere in the world.</p>
          </div>
        </div>
      </section>
      <footer className="home-footer">
        <p>&copy; 2026 Citibank, N.A. All rights reserved.</p>
      </footer>
    </div>
  );
}
function App() {
  const [auth, setAuth] = useState(null);
  const path = window.location.pathname;
  const isPublicRoute = ["/", "/login", "/register", "/forgot-access-code", "/admin/login"].includes(path);

  useEffect(() => {
    if (isPublicRoute) {
      setAuth(false);
      return;
    }

    api("/auth/me")
      .then((me) => {
        if (me && me.role) window.__smbcLastRole = me.role;
        setAuth(me);
      })
      .catch(() => setAuth(false));
  }, [path, isPublicRoute]);

  const localLogout = async () => {
    const role = auth?.role || window.__smbcLastRole || null;
    await api("/auth/logout", { method: "POST" }).catch(() => {});
    window.location.href = role === "admin" ? "/admin/login" : "/login";
  };
  if (path === "/admin/login") return <Login admin />;
  if (path === "/register") return <Register />;
  if (path === "/forgot-access-code") return <ForgotAccessCode />;
  if (path === "/login") return <Login />;
  if (path === "/" || path === "") return <Home />;
  if (auth === null)
    return <div className="loading-page">Loading Citibank...</div>;
  if (!auth) {
    window.location.href = path.startsWith("/admin")
      ? "/admin/login"
      : "/login";
    return null;
  }
  if (path.startsWith("/admin") && auth.role !== "admin") {
    window.location.href = "/dashboard";
    return null;
  }
  if (!path.startsWith("/admin") && auth.role !== "customer") {
    window.location.href = "/admin/dashboard";
    return null;
  }
  if (auth.role === "admin") {
    if (path === "/admin" || path === "/admin/" || path === "/admin/dashboard") return <AdminDashboard user={auth} onLogout={localLogout} />;
    if (path === "/admin/customers") return <AdminCustomers user={auth} />;
    if (path.startsWith("/admin/customers/")) return <AdminCustomerDetail user={auth} id={path.split("/").pop()} />;
    if (path === "/admin/admins") return <AdminManagement user={auth} />;
    if (path === "/admin/accounts") return <AdminAccounts user={auth} />;
    if (path === "/admin/transactions") return <AdminTransactions user={auth} />;
    if (path === "/admin/transfers") return <AdminTransfers user={auth} />;
    if (path.startsWith("/admin/transfers/"))
      return <TransferDetail user={auth} id={path.split("/").pop()} />;
    if (path === "/admin/audit-log") return <AdminAuditLog user={auth} />;
    if (path === "/admin/verification") return <AdminVerification user={auth} />;
    if (path === "/admin/notifications") return <AdminNotifications user={auth} />;
    if (path === "/admin/settings") return <SettingsPage user={auth} admin />;
    window.location.href = "/admin/dashboard";
    return null;
  }
  if (path === "/dashboard" || path === "") return <CustomerDashboard user={auth} onLogout={localLogout} />;
  if (path === "/accounts") return <CustomerAccounts user={auth} />;
  if (path.startsWith("/accounts/")) return <CustomerAccountDetail user={auth} id={path.split("/").pop()} />;
  if (path === "/transactions") return <CustomerTransactions user={auth} />;
  if (path === "/transfers") return <CustomerTransfers user={auth} />;
  if (path === "/transfers/new") return <TransferNew user={auth} />;
  if (path.startsWith("/transfers/") && path.endsWith("/verify"))
    return <Verify user={auth} id={path.split("/")[2]} />;
  if (path.startsWith("/transfers/"))
    return <TransferProcess user={auth} id={path.split("/").pop()} />;
  if (path === "/notifications") return <Notifications user={auth} />;
  if (path === "/profile") return <CustomerProfile user={auth} />;
  if (path === "/settings") return <SettingsPage user={auth} />;
  window.location.href = "/dashboard";
  return null;
}
createRoot(document.getElementById("root")).render(<App />);

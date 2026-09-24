import Link from "next/link";

export default function NotFound() {
  return (
    <main className="main" style={{ paddingTop: "18vh", textAlign: "center" }}>
      <div className="eyebrow">404</div>
      <h1 className="greeting" style={{ marginTop: 10 }}>
        Esta página <em>não está na mesa.</em>
      </h1>
      <p className="brief" style={{ margin: "12px auto 24px" }}>O endereço pode estar errado ou a página foi movida.</p>
      <Link href="/" className="btn btn--primary">
        Voltar ao início
      </Link>
    </main>
  );
}

import { Link } from "react-router-dom";

const items = [
  {
    title: "Segurança",
    text: "Seus dados são protegidos por processos confiáveis, validações ativas e navegação segura em toda a plataforma.",
    icon: "fa-solid fa-shield-halved"
  },
  {
    title: "Economia",
    text: "Encontre oportunidades com valores competitivos, procedência clara e mais previsibilidade na hora de comprar.",
    icon: "fa-solid fa-piggy-bank"
  },
  {
    title: "Variedade",
    text: "Explore diferentes categorias de ativos e encontre opções para uso pessoal, frota, negócio ou investimento.",
    icon: "fa-solid fa-box-open"
  },
  {
    title: "Transparência",
    text: "Todo o processo de disputa acontece com regras definidas, histórico visível e participação justa entre os interessados.",
    icon: "fa-solid fa-scale-balanced"
  }
];

export default function ValueProps() {
  return (
    <section className="values">
      <div className="values-head">
        <h2>Por que comprar na Copart Leilões?</h2>
        <p>Junte-se a compradores de todo o Brasil para arrematar com segurança, economia e clareza em cada etapa.</p>
      </div>

      <div className="values-grid">
        {items.map((item) => (
          <article key={item.title} className="value">
            <div className="value-icon" aria-hidden="true">
              <i className={item.icon} />
            </div>
            <h3>{item.title}</h3>
            <p>{item.text}</p>
          </article>
        ))}
      </div>

      <div className="values-cta">
        <span>Copart Leilões em ambiente seguro, com navegação protegida e suporte ao comprador.</span>
        <Link className="cta" to="/cadastro">Cadastre-se</Link>
      </div>
    </section>
  );
}

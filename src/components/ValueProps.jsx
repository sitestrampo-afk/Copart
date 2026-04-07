const items = [
  {
    title: "Segurança",
    text: "Dados protegidos com padrões elevados de segurança e validações.",
    icon: "fa-solid fa-shield-halved"
  },
  {
    title: "Economia",
    text: "Lotes abaixo da tabela com procedência e vistoria completa.",
    icon: "fa-solid fa-piggy-bank"
  },
  {
    title: "Variedade",
    text: "Centenas de ativos em diversas categorias para sua empresa ou família.",
    icon: "fa-solid fa-box-open"
  },
  {
    title: "Transparência",
    text: "Processo de lances auditável e sem interferência humana.",
    icon: "fa-solid fa-scale-balanced"
  }
];

export default function ValueProps() {
  return (
    <section className="values">
      <h2>Por que comprar no Leilão Copart?</h2>
      <p>Junte-se a milhares de pessoas que compram com segurança.</p>
      <div className="values-grid">
        {items.map((item) => (
          <div key={item.title} className="value">
            <div className="value-icon">
              <i className={item.icon} />
            </div>
            <h3>{item.title}</h3>
            <p>{item.text}</p>
          </div>
        ))}
      </div>
      <div className="values-cta">
        <span>Site seguro com SSL certificado.</span>
        <button className="cta">Cadastre-se</button>
      </div>
    </section>
  );
}

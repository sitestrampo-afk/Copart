export default function Hero() {
  return (
    <section className="hero hero-market">
      <div className="hero-market-bg" aria-hidden="true" />
      <div className="hero-market-content">
        <div className="hero-market-copy">
          <p className="hero-market-kicker">Leilão Copart</p>
          <h1>
            Conectando <span>compradores</span> e <span>vendedores</span> ao redor do mundo.
          </h1>
          <p>
            São mais de 12.974 veículos disponíveis para compra online. De automóveis a caminhões,
            motocicletas e muito mais.
          </p>
        </div>
        <div className="hero-market-cards">
          <article className="market-card">
            <div className="market-card-head">
              <h3>Venda Direta</h3>
              <ul>
                <li>Disponível 24h por dia</li>
                <li>Veículos com laudo</li>
                <li>Negociação intermediada</li>
                <li>Diversas opções com garantia</li>
              </ul>
            </div>
            <div className="market-card-actions">
              <button>Comprar</button>
              <button className="ghost">Vender</button>
            </div>
          </article>
          <article className="market-card">
            <div className="market-card-head">
              <h3>Leilão</h3>
              <ul>
                <li>Mais de 70 leilões mensais</li>
                <li>De bancos, seguradoras e mais</li>
                <li>Faça seus lances online</li>
                <li>Veículos com procedência</li>
              </ul>
            </div>
            <div className="market-card-actions">
              <button>Comprar</button>
              <button className="ghost">Vender</button>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

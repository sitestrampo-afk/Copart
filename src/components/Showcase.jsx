export default function Showcase() {
  return (
    <section className="showcase">
      <div className="showcase-left">
        <h2>Quem é a Leilão Copart?</h2>
        <p>
          A Leilão Copart é referência em leilões de veículos e ativos com processos transparentes e
          oportunidades reais para compradores e vendedores. Reunimos dezenas de categorias em um
          único lugar com tecnologia, segurança e praticidade.
        </p>
        <p>
          Aqui você encontra desde leilões dinâmicos até vendas diretas com valores fixos. Nossa
          missão é conectar pessoas a bons negócios, com suporte especializado e informações claras.
        </p>
        <p>
          Participe, acompanhe seus lances e descubra como é simples comprar ou vender com uma
          equipe que entende do assunto.
        </p>
        <button className="cta">Faça seu cadastro</button>
      </div>
      <div className="showcase-right">
        <h3>Leilão Copart: sua plataforma de compra e venda online</h3>
        <div className="showcase-grid">
          <article className="showcase-card">
            <div className="showcase-card-media showcase-media-1">
              <h4>Venda Direta</h4>
              <span>Confira</span>
            </div>
            <div className="showcase-links">
              <a>Veículos à venda</a>
              <a>Como vender</a>
            </div>
          </article>
          <article className="showcase-card">
            <div className="showcase-card-media showcase-media-2">
              <h4>Automóveis</h4>
              <span>Confira</span>
            </div>
            <div className="showcase-links two-col">
              <a>Volkswagen</a>
              <a>Pequena monta</a>
              <a>Chevrolet</a>
              <a>Média monta</a>
              <a>Fiat</a>
              <a>Grande monta</a>
            </div>
          </article>
          <article className="showcase-card">
            <div className="showcase-card-media showcase-media-3">
              <h4>Caminhões</h4>
              <span>Confira</span>
            </div>
            <div className="showcase-links">
              <a>Picapes grandes</a>
              <a>Mercedes Benz</a>
              <a>Volkswagen</a>
            </div>
          </article>
          <article className="showcase-card">
            <div className="showcase-card-media showcase-media-4">
              <h4>Motocicletas</h4>
              <span>Confira</span>
            </div>
            <div className="showcase-links two-col">
              <a>CG-160</a>
              <a>Pequena monta</a>
              <a>CG-125</a>
              <a>Média monta</a>
              <a>Honda</a>
              <a>Grande monta</a>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}


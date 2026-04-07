const stats = [
  { label: "Leil\u00F5es ativos", value: 48 },
  { label: "Usu\u00E1rios", value: 12940 },
  { label: "Lances hoje", value: 862 },
  { label: "Receita", value: "R$ 1.2M" }
];

const actions = [
  "Cadastrar novo lote",
  "Aprovar usu\u00E1rios",
  "Gerenciar categorias",
  "Relat\u00F3rios"
];

export default function AdminDashboard() {
  return (
    <main className="admin-dashboard">
      <div className="admin-header">
        <h1>Painel Administrativo</h1>
        <button className="cta">Novo leilão</button>
      </div>
      <div className="stats">
        {stats.map((item) => (
          <div key={item.label} className="stat-card">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>
      <div className="admin-grid">
        <section className="admin-card">
          <h2>Atalhos r\u00E1pidos</h2>
          <ul>
            {actions.map((action) => (
              <li key={action}>{action}</li>
            ))}
          </ul>
        </section>
        <section className="admin-card">
          <h2>\u00DAltimos lances</h2>
          <div className="table">
            <div>
              <span>Usu\u00E1rio</span>
              <span>Lote</span>
              <span>Valor</span>
            </div>
            <div>
              <span>Mariana P.</span>
              <span>BMW X1</span>
              <span>R$ 118.000</span>
            </div>
            <div>
              <span>Anderson L.</span>
              <span>Casa Centro</span>
              <span>R$ 390.000</span>
            </div>
            <div>
              <span>Bruno S.</span>
              <span>Amarok</span>
              <span>R$ 92.000</span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

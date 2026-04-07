import { useState } from "react";
import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";
import { apiPost } from "../services/api.js";

function onlyDigits(value) {
  return value.replace(/\D/g, "");
}

function maskCPF(value) {
  const digits = onlyDigits(value).slice(0, 11);
  const part1 = digits.slice(0, 3);
  const part2 = digits.slice(3, 6);
  const part3 = digits.slice(6, 9);
  const part4 = digits.slice(9, 11);
  if (digits.length <= 3) return part1;
  if (digits.length <= 6) return `${part1}.${part2}`;
  if (digits.length <= 9) return `${part1}.${part2}.${part3}`;
  return `${part1}.${part2}.${part3}-${part4}`;
}

function maskCNPJ(value) {
  const digits = onlyDigits(value).slice(0, 14);
  const p1 = digits.slice(0, 2);
  const p2 = digits.slice(2, 5);
  const p3 = digits.slice(5, 8);
  const p4 = digits.slice(8, 12);
  const p5 = digits.slice(12, 14);
  if (digits.length <= 2) return p1;
  if (digits.length <= 5) return `${p1}.${p2}`;
  if (digits.length <= 8) return `${p1}.${p2}.${p3}`;
  if (digits.length <= 12) return `${p1}.${p2}.${p3}/${p4}`;
  return `${p1}.${p2}.${p3}/${p4}-${p5}`;
}

function isValidCNPJ(value) {
  const digits = onlyDigits(value);
  if (digits.length !== 14) return false;
  if (/^(\d)\1+$/.test(digits)) return false;

  const calc = (base, weights) => {
    let sum = 0;
    for (let i = 0; i < weights.length; i += 1) {
      sum += parseInt(base[i], 10) * weights[i];
    }
    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  };

  const base = digits.slice(0, 12);
  const digit1 = calc(base, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const digit2 = calc(base + digit1, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return digits.endsWith(`${digit1}${digit2}`);
}

function isValidCPF(value) {
  const digits = onlyDigits(value);
  if (digits.length !== 11) return false;
  if (/^(\d)\1+$/.test(digits)) return false;

  const calc = (base, factor) => {
    let sum = 0;
    for (let i = 0; i < base.length; i += 1) {
      sum += parseInt(base[i], 10) * (factor - i);
    }
    const mod = (sum * 10) % 11;
    return mod === 10 ? 0 : mod;
  };

  const base = digits.slice(0, 9);
  const digit1 = calc(base, 10);
  const digit2 = calc(base + digit1, 11);
  return digits.endsWith(`${digit1}${digit2}`);
}

function isStrong(password) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(password);
}

function maskPhone(value) {
  const digits = onlyDigits(value).slice(0, 11);
  const ddd = digits.slice(0, 2);
  const part1 = digits.slice(2, digits.length > 10 ? 7 : 6);
  const part2 = digits.slice(digits.length > 10 ? 7 : 6, 11);
  if (digits.length <= 2) return `(${ddd}`;
  if (digits.length <= 6) return `(${ddd}) ${part1}`;
  return `(${ddd}) ${part1}-${part2}`;
}

function maskCEP(value) {
  const digits = onlyDigits(value).slice(0, 8);
  const part1 = digits.slice(0, 5);
  const part2 = digits.slice(5, 8);
  if (digits.length <= 5) return part1;
  return `${part1}-${part2}`;
}

export default function Cadastro() {
  const [type, setType] = useState("pf");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [cpf, setCpf] = useState("");
  const [rg, setRg] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [ie, setIe] = useState("");
  const [telefone, setTelefone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [cep, setCep] = useState("");
  const [endereco, setEndereco] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [usuario, setUsuario] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [cepStatus, setCepStatus] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const passwordIsStrong = isStrong(password);
  const passwordHelper = !password
    ? "Use 8+ caracteres com maiuscula, minuscula, numero e simbolo."
    : passwordIsStrong
      ? "Senha forte."
      : "Senha fraca. Use 8+ caracteres, maiuscula, minuscula, numero e simbolo.";

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!accepted) {
      setError("Você precisa aceitar os termos e condições.");
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas não conferem.");
      return;
    }

    if (!isStrong(password)) {
      setError("Senha fraca. Use 8+ caracteres, maiúscula, minúscula, número e símbolo.");
      return;
    }

    if (type === "pf" && !isValidCPF(cpf)) {
      setError("CPF inválido.");
      return;
    }

    if (type === "pj" && !isValidCNPJ(cnpj)) {
      setError("CNPJ inválido.");
      return;
    }

    try {
      await apiPost("/api/auth/register", {
        type,
        name,
        email,
        password,
        cpf,
        rg,
        cnpj,
        ie,
        phone: telefone,
        whatsapp,
        cep,
        address: endereco,
        number: numero,
        complement: complemento,
        neighborhood: bairro,
        city: cidade,
        state: estado,
        username: usuario,
        termsAccepted: accepted
      });
      setMessage("Cadastro realizado. Enviamos um email de confirmação.");
      setShowModal(true);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleCepBlur() {
    const digits = onlyDigits(cep);
    if (digits.length !== 8) {
      return;
    }
    setCepStatus("Buscando CEP...");
    try {
      const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await response.json();
      if (data.erro) {
        setCepStatus("CEP não encontrado");
        return;
      }
      setEndereco(data.logradouro || "");
      setBairro(data.bairro || "");
      setCidade(data.localidade || "");
      setEstado(data.uf || "");
      setCepStatus("Endereço preenchido");
    } catch (err) {
      setCepStatus("Erro ao buscar CEP");
    }
  }

  return (
    <div>
      <Navbar />
      <main className="auth-page">
        <div className="auth-card wide">
          <h2>Faça seu cadastro</h2>
          <div className="tab-row">
            <button
              className={`tab ${type === "pf" ? "active" : ""}`}
              type="button"
              onClick={() => setType("pf")}
            >
              Pessoa Física
            </button>
            <button
              className={`tab ${type === "pj" ? "active" : ""}`}
              type="button"
              onClick={() => setType("pj")}
            >
              Pessoa Jurídica
            </button>
          </div>
          <form className="grid-form" onSubmit={handleSubmit}>
            <label>
              Nome
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
            <label>
              Email
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            {type === "pf" ? (
              <>
                <label>
                  CPF
                  <input
                    type="text"
                    value={cpf}
                    onChange={(e) => setCpf(maskCPF(e.target.value))}
                    placeholder="000.000.000-00"
                    required
                  />
                </label>
                <label>
                  RG (opcional)
                  <input type="text" value={rg} onChange={(e) => setRg(e.target.value)} />
                </label>
              </>
            ) : (
              <>
                <label>
                  CNPJ
                  <input
                    type="text"
                    value={cnpj}
                    onChange={(e) => setCnpj(maskCNPJ(e.target.value))}
                    placeholder="00.000.000/0000-00"
                    required
                  />
                </label>
                <label>
                  Inscrição estadual (opcional)
                  <input type="text" value={ie} onChange={(e) => setIe(e.target.value)} />
                </label>
              </>
            )}
            <label>
              Telefone
              <input
                type="text"
                value={telefone}
                onChange={(e) => setTelefone(maskPhone(e.target.value))}
                placeholder="(00) 0000-0000"
              />
            </label>
            <label>
              WhatsApp
              <input
                type="text"
                value={whatsapp}
                onChange={(e) => setWhatsapp(maskPhone(e.target.value))}
                placeholder="(00) 00000-0000"
              />
            </label>
            <label>
              CEP
              <input
                type="text"
                value={cep}
                onChange={(e) => setCep(maskCEP(e.target.value))}
                onBlur={handleCepBlur}
                placeholder="00000-000"
                required
              />
              {cepStatus && <small className="helper-text">{cepStatus}</small>}
            </label>
            <label>
              Endereço
              <input type="text" value={endereco} onChange={(e) => setEndereco(e.target.value)} required />
            </label>
            <label>
              Número
              <input type="text" value={numero} onChange={(e) => setNumero(e.target.value)} required />
            </label>
            <label>
              Complemento
              <input type="text" value={complemento} onChange={(e) => setComplemento(e.target.value)} />
            </label>
            <label>
              Bairro
              <input type="text" value={bairro} onChange={(e) => setBairro(e.target.value)} required />
            </label>
            <label>
              Cidade
              <input type="text" value={cidade} onChange={(e) => setCidade(e.target.value)} required />
            </label>
            <label>
              Estado
              <input type="text" value={estado} onChange={(e) => setEstado(e.target.value)} required />
            </label>
            <label>
              Usuário
              <input type="text" value={usuario} onChange={(e) => setUsuario(e.target.value)} />
            </label>
            <label>
              Senha
              <div className="password-field">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="ghost icon-button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  <i className={`fa-regular ${showPassword ? "fa-eye-slash" : "fa-eye"}`} />
                </button>
              </div>
              <small className={`helper-text password-helper ${password && !passwordIsStrong ? "error" : "success"}`}>
                {passwordHelper}
              </small>
            </label>
            <label>
              Confirmar senha
              <div className="password-field">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="ghost icon-button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  aria-label={showConfirmPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  <i className={`fa-regular ${showConfirmPassword ? "fa-eye-slash" : "fa-eye"}`} />
                </button>
              </div>
            </label>
            <label className="terms">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
              />
              <span>Li e aceito os termos e condições.</span>
            </label>
            {error && <div className="alert">{error}</div>}
            <div className="auth-actions">
              <button className="cta" type="submit">Cadastrar</button>
              <button className="ghost" type="button">Preciso de ajuda</button>
            </div>
          </form>
        </div>
      </main>
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3>Cadastro realizado</h3>
            <p>Enviamos um email de confirmação.</p>
            <div className="modal-actions">
              <button className="ghost" type="button" onClick={() => setShowModal(false)}>
                Confirmar
              </button>
              <button
                className="cta"
                type="button"
                onClick={() => window.open("https://mail.google.com", "_blank")}
              >
                Ir para Gmail
              </button>
            </div>
          </div>
        </div>
      )}
      <Footer />
    </div>
  );
}

import React, { useEffect, useMemo, useState } from "react";
import {
  Home, MapPin, PlusCircle, Users, Vote, LogIn, UserRound,
  Search, Camera, ChevronRight, CheckCircle2, AlertCircle,
  LogOut, Menu, X, Filter, HeartHandshake, Building2
} from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { supabase, backendConfigured } from "./supabase";

const sampleReports = [
  { id:"demo-1", title:"Buraco na rua", category:"Infraestrutura", neighborhood:"Centro", description:"Há um buraco próximo à praça que dificulta a passagem.", status:"Em análise", votes:18, lat:-20.6660, lng:-43.7850 },
  { id:"demo-2", title:"Lâmpada queimada", category:"Iluminação", neighborhood:"São João", description:"Poste sem iluminação há alguns dias.", status:"Recebido", votes:12, lat:-20.6700, lng:-43.7900 },
  { id:"demo-3", title:"Descarte irregular de lixo", category:"Limpeza", neighborhood:"Santa Matilde", description:"Acúmulo de resíduos em área pública.", status:"Em andamento", votes:9, lat:-20.6600, lng:-43.7800 }
];
const samplePros = [
  { id:"p1", name:"Profissional parceiro", specialty:"Serviços elétricos", area:"Atendimento na comunidade", phone:"Cadastro demonstrativo" },
  { id:"p2", name:"Profissional parceiro", specialty:"Reparos e manutenção", area:"Atendimento na comunidade", phone:"Cadastro demonstrativo" },
  { id:"p3", name:"Profissional parceiro", specialty:"Orientação comunitária", area:"Atendimento na comunidade", phone:"Cadastro demonstrativo" }
];

function App() {
  const [tab, setTab] = useState("inicio");
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [reports, setReports] = useState(sampleReports);
  const [pros, setPros] = useState(samplePros);
  const [authMode, setAuthMode] = useState("login");
  const [showAuth, setShowAuth] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [toast, setToast] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Todos");
  const [form, setForm] = useState({title:"", category:"Infraestrutura", neighborhood:"", description:"", address:"", cep:""});
  const [auth, setAuth] = useState({name:"", email:"", password:"", address:"", cep:""});
  const [loading, setLoading] = useState(false);

  const notify = (message) => { setToast(message); window.setTimeout(() => setToast(""), 3200); };

  useEffect(() => {
    if (!backendConfigured) return;
    supabase.auth.getSession().then(({data}) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session || !backendConfigured) { setProfile(null); return; }
    loadProfile();
  }, [session]);

  useEffect(() => {
    loadReports();
    loadProfessionals();
  }, [session]);

  async function loadProfile() {
    const { data } = await supabase.from("profiles").select("*").eq("id", session.user.id).maybeSingle();
    setProfile(data || null);
  }
  async function loadReports() {
    if (!backendConfigured) return;
    const { data, error } = await supabase.from("reports").select("*").order("created_at", {ascending:false});
    if (!error && data) setReports(data);
  }
  async function loadProfessionals() {
    if (!backendConfigured) return;
    const { data, error } = await supabase.from("professionals").select("*").eq("active", true);
    if (!error && data?.length) setPros(data);
  }

  function requireAccount(action) {
    if (!session) {
      setPendingAction(action);
      setAuthMode("signup");
      setShowAuth(true);
      notify("Entre ou crie uma conta para continuar.");
      return false;
    }
    return true;
  }

  async function submitAuth(e) {
    e.preventDefault();
    if (!backendConfigured) { notify("Configure o banco online seguindo o README para ativar contas reais."); return; }
    setLoading(true);
    try {
      if (authMode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: auth.email, password: auth.password,
          options: { data: { full_name: auth.name, address: auth.address, cep: auth.cep } }
        });
        if (error) throw error;
        if (data.user) {
          const { error: profileError } = await supabase.from("profiles").upsert({
            id: data.user.id, full_name: auth.name, address: auth.address, cep: auth.cep
          });
          if (profileError) throw profileError;
        }
        notify("Cadastro enviado. Verifique seu e-mail se a confirmação estiver ativada.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({email:auth.email,password:auth.password});
        if (error) throw error;
        notify("Login realizado!");
      }
      setShowAuth(false);
    } catch (err) { notify(err.message || "Não foi possível concluir o acesso."); }
    finally { setLoading(false); }
  }

  async function logout() {
    if (backendConfigured) await supabase.auth.signOut();
    setSession(null); setProfile(null); setTab("inicio"); notify("Você saiu da sua conta.");
  }

  async function submitReport(e) {
    e.preventDefault();
    if (!requireAccount("report")) return;
    if (!form.title.trim() || !form.description.trim()) { notify("Preencha o título e a descrição."); return; }
    if (!backendConfigured) { notify("O banco online ainda não foi configurado. Consulte o README."); return; }
    const { error } = await supabase.from("reports").insert({
      title:form.title, category:form.category, neighborhood:form.neighborhood,
      description:form.description, status:"Recebido", user_id:session.user.id
    });
    if (error) { notify(error.message); return; }
    setForm({title:"",category:"Infraestrutura",neighborhood:"",description:"",address:"",cep:""});
    await loadReports(); setTab("bairro"); notify("Problema registrado com sucesso!");
  }

  async function vote(reportId) {
    if (!requireAccount("vote")) return;
    if (!backendConfigured) { notify("Configure o banco online para registrar votos."); return; }
    const { error } = await supabase.from("votes").upsert(
      { report_id:reportId, user_id:session.user.id },
      { onConflict:"report_id,user_id" }
    );
    if (error) notify(error.message); else { notify("Seu voto foi registrado!"); loadReports(); }
  }

  const filtered = useMemo(() => reports.filter(r =>
    (filter === "Todos" || r.category === filter) &&
    `${r.title} ${r.neighborhood} ${r.description}`.toLowerCase().includes(search.toLowerCase())
  ), [reports, filter, search]);

  const goAction = (action) => {
    if (action === "report") setTab("registrar");
    if (action === "vote") setTab("prioridades");
    if (action === "help") setTab("profissionais");
    setShowAuth(false);
    setPendingAction(null);
  };

  const categories = ["Todos","Infraestrutura","Iluminação","Limpeza","Segurança","Saúde","Acessibilidade"];
  const nav = [
    ["inicio","Início",Home],["bairro","Bairro",Building2],["mapa","Mapa",MapPin],
    ["profissionais","Profissionais",Users],["prioridades","Prioridades",Vote]
  ];

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand-mark">AV</div>
      <div className="brand-copy"><strong>A Voz dos Bairros</strong><span>Sua comunidade, sua voz.</span></div>
      <button className="account-button" onClick={() => session ? logout() : (setAuthMode("login"),setShowAuth(true))}>
        {session ? <LogOut size={17}/> : <UserRound size={18}/>}
        <span>{session ? "Sair" : "Entrar"}</span>
      </button>
    </header>

    <main className="content">
      {tab === "inicio" && <section className="home-view">
        <div className="hero">
          <span className="eyebrow">PARTICIPAÇÃO COMUNITÁRIA</span>
          <h1>A mudança começa<br/><em>com a sua voz.</em></h1>
          <p>Veja o que acontece no seu bairro, compartilhe problemas e ajude a definir o que precisa de atenção primeiro.</p>
          <button className="primary-btn" onClick={() => setTab("bairro")}>Explorar meu bairro <ChevronRight size={18}/></button>
          <div className="hero-decoration"><div className="sun"></div><div className="hill hill-one"></div><div className="hill hill-two"></div></div>
        </div>
        <div className="section-heading"><div><span className="eyebrow">ACOMPANHE</span><h2>O que está acontecendo</h2></div><button className="text-btn" onClick={() => setTab("bairro")}>Ver todos <ChevronRight size={16}/></button></div>
        <div className="stats-grid">
          <div className="stat-card"><span>Problemas visíveis</span><strong>{reports.length}</strong><small>na comunidade</small></div>
          <div className="stat-card"><span>Participação</span><strong>{reports.reduce((n,r)=>n+(r.votes||0),0)}</strong><small>votos demonstrativos e registrados</small></div>
        </div>
        <div className="quick-actions">
          <button onClick={() => { if(requireAccount("report")) setTab("registrar"); }}><PlusCircle/><span>Registrar problema</span></button>
          <button onClick={() => setTab("prioridades")}><Vote/><span>Ver prioridades</span></button>
          <button onClick={() => setTab("profissionais")}><HeartHandshake/><span>Encontrar ajuda</span></button>
        </div>
        <p className="visitor-note">Você pode navegar como visitante. O cadastro é solicitado somente para registrar problemas e votar.</p>
      </section>}

      {tab === "bairro" && <section>
        <div className="page-heading"><span className="eyebrow">SUA COMUNIDADE</span><h1>Problemas do bairro</h1><p>Acompanhe os relatos e veja o andamento de cada situação.</p></div>
        <div className="search-row"><Search size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar problema ou bairro..."/></div>
        <div className="filter-row"><Filter size={16}/>{categories.map(c=><button key={c} className={filter===c?"selected":""} onClick={()=>setFilter(c)}>{c}</button>)}</div>
        <div className="report-list">{filtered.map(r=><article className="report-card" key={r.id}>
          <div className="report-top"><span className="category-tag">{r.category}</span><span className="status">{r.status}</span></div>
          <h3>{r.title}</h3><p>{r.description}</p><div className="report-meta"><span><MapPin size={14}/>{r.neighborhood || "Local não informado"}</span><button onClick={()=>vote(r.id)}><Vote size={15}/> Apoiar <b>{r.votes || 0}</b></button></div>
        </article>)}
        {!filtered.length && <div className="empty-state">Nenhum problema encontrado com esse filtro.</div>}</div>
        <button className="primary-btn full" onClick={()=>{if(requireAccount("report"))setTab("registrar")}}><PlusCircle size={18}/> Registrar um problema</button>
      </section>}

      {tab === "registrar" && <section>
        <div className="page-heading"><span className="eyebrow">FAÇA SUA PARTE</span><h1>Registrar problema</h1><p>Conte o que está acontecendo. Seu relato ajuda a comunidade a cobrar melhorias.</p></div>
        {!session ? <div className="notice"><AlertCircle/> Entre ou crie uma conta para registrar um problema.</div> : <form className="form-card" onSubmit={submitReport}>
          <label>Título do problema<input required value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Ex.: Buraco na rua principal"/></label>
          <label>Categoria<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{categories.slice(1).map(c=><option key={c}>{c}</option>)}</select></label>
          <label>Bairro ou região<input value={form.neighborhood} onChange={e=>setForm({...form,neighborhood:e.target.value})} placeholder="Informe o bairro"/></label>
          <label>Descrição<textarea required rows="4" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Explique o que aconteceu e onde fica o problema."/></label>
          <p className="privacy-hint">Não inclua seu endereço residencial na descrição. Informe apenas o local do problema.</p>
          <button className="primary-btn full" type="submit">Enviar relato <ChevronRight size={18}/></button>
        </form>}
      </section>}

      {tab === "mapa" && <section>
        <div className="page-heading"><span className="eyebrow">VISÃO GERAL</span><h1>Mapa da comunidade</h1><p>Os pontos de exemplo ajudam a visualizar como os relatos poderão aparecer no mapa.</p></div>
        <div className="map-frame"><MapContainer center={[-20.666,-43.785]} zoom={13} scrollWheelZoom={false} style={{height:"100%",width:"100%"}}>
          <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
          {reports.filter(r=>r.lat && r.lng).map(r=><Marker key={r.id} position={[r.lat,r.lng]}><Popup><b>{r.title}</b><br/>{r.status}</Popup></Marker>)}
        </MapContainer></div>
        <p className="privacy-hint">O mapa usa pontos ilustrativos nesta versão. A localização real de cada relato deverá ser adicionada pelo usuário ao registrar o problema.</p>
      </section>}

      {tab === "profissionais" && <section>
        <div className="page-heading"><span className="eyebrow">REDE DE APOIO</span><h1>Profissionais</h1><p>Encontre pessoas e serviços que podem ajudar a comunidade.</p></div>
        <div className="professional-list">{pros.map(p=><article className="professional-card" key={p.id}>
          <div className="professional-icon"><UserRound/></div><div className="professional-info"><h3>{p.name}</h3><span>{p.specialty}</span><small>{p.area}</small></div><ChevronRight size={18}/>
        </article>)}</div>
        <p className="privacy-hint">Os perfis exibidos são demonstrativos até que profissionais reais sejam cadastrados e verificados.</p>
      </section>}

      {tab === "prioridades" && <section>
        <div className="page-heading"><span className="eyebrow">DECISÕES COLETIVAS</span><h1>Prioridades do bairro</h1><p>Vote nos problemas que merecem atenção primeiro. É necessário ter uma conta para votar.</p></div>
        <div className="priority-list">{[...reports].sort((a,b)=>(b.votes||0)-(a.votes||0)).map((r,i)=><article className="priority-card" key={r.id}>
          <div className="rank">{String(i+1).padStart(2,"0")}</div><div className="priority-info"><span>{r.category}</span><h3>{r.title}</h3><small>{r.neighborhood || "Comunidade"}</small><div className="vote-track"><i style={{width:`${Math.min(100,((r.votes||0)/Math.max(20,...reports.map(x=>x.votes||0)))*100)}%`}}/></div></div><button className="vote-button" onClick={()=>vote(r.id)}><Vote size={17}/><b>{r.votes||0}</b><small>votos</small></button>
        </article>)}</div>
      </section>}
    </main>

    <nav className="bottom-nav">{nav.map(([id,label,Icon])=><button key={id} className={tab===id?"active":""} onClick={()=>setTab(id)}><Icon size={20}/><span>{label}</span></button>)}</nav>

    {showAuth && <div className="modal-backdrop" onClick={()=>setShowAuth(false)}><div className="auth-modal" onClick={e=>e.stopPropagation()}>
      <button className="close-modal" onClick={()=>setShowAuth(false)}><X/></button>
      <span className="eyebrow">{authMode==="signup"?"PARTICIPE DA COMUNIDADE":"BEM-VINDO DE VOLTA"}</span>
      <h2>{authMode==="signup"?"Crie sua conta":"Entre na sua conta"}</h2>
      <p>{authMode==="signup"?"O cadastro permite registrar problemas e votar nas prioridades.":"Acesse sua conta para participar das decisões."}</p>
      {!backendConfigured && <div className="notice compact"><AlertCircle size={17}/> A conexão com o banco online precisa ser configurada antes de ativar contas reais.</div>}
      <form onSubmit={submitAuth}>
        {authMode==="signup" && <>
          <label>Nome completo<input required value={auth.name} onChange={e=>setAuth({...auth,name:e.target.value})} placeholder="Seu nome"/></label>
          <label>Endereço<input required value={auth.address} onChange={e=>setAuth({...auth,address:e.target.value})} placeholder="Endereço (privado)"/></label>
          <label>CEP<input required inputMode="numeric" maxLength="9" value={auth.cep} onChange={e=>setAuth({...auth,cep:e.target.value})} placeholder="00000-000"/></label>
        </>}
        <label>E-mail<input required type="email" value={auth.email} onChange={e=>setAuth({...auth,email:e.target.value})} placeholder="voce@email.com"/></label>
        <label>Senha<input required type="password" minLength="6" value={auth.password} onChange={e=>setAuth({...auth,password:e.target.value})} placeholder="Mínimo de 6 caracteres"/></label>
        <button className="primary-btn full" disabled={loading} type="submit">{loading?"Aguarde...":authMode==="signup"?"Criar conta":"Entrar"}</button>
      </form>
      <button className="switch-auth" onClick={()=>setAuthMode(authMode==="signup"?"login":"signup")}>{authMode==="signup"?"Já tem conta? Entrar":"Ainda não tem conta? Cadastre-se"}</button>
    </div></div>}
    {toast && <div className="toast"><CheckCircle2 size={17}/>{toast}</div>}
    <footer className="app-footer">A Voz dos Bairros <span>•</span> Participação que transforma</footer>
  </div>;
}

export default App;

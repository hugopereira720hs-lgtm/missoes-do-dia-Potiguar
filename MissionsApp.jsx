import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, onSnapshot, collection, query, updateDoc } from 'firebase/firestore';

// --- CONFIGURAÇÕES GLOBAIS FIREBASE (MANDATÓRIO) ---
// Estes valores são injetados automaticamente pelo ambiente
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Configuração da UI
const ACCENT_COLOR = '#FFD54F'; // Amarelo Potiguar Creativa
const BG_COLOR = '#0d0d0d';      // Fundo Escuro
const TEXT_COLOR = '#e5e5e5';    // Cinza Claro

// --- DADOS DAS MISSÕES (30 dias) ---
const dailyMissions = [
  { title: "Mostre um bastidor do seu dia.", desc: "Dê um toque humano à sua marca. Mostre o processo por trás da cortina.", examples: ["O ritual do café antes de começar a produção", "A tela ou mesa de trabalho no meio de um projeto", "O equipamento essencial sendo preparado."] },
  { title: "Publique uma dica útil.", desc: "Compartilhe conhecimento prático que ajude seu público imediatamente.", examples: ["Um atalho que economiza tempo no seu nicho", "3 passos para evitar um erro comum", "Ferramentas gratuitas que facilitam a vida do cliente."] },
  { title: "Mostre um feedback real de cliente.", desc: "Use a prova social para construir confiança. Print de WhatsApp ou depoimento gravado.", examples: ["Print de um elogio no Direct/WhatsApp", "Um cliente satisfeito usando/falando sobre a solução", "Um depoimento rápido em vídeo ou áudio."] },
  { title: "Apresente sua solução mais popular.", desc: "Fale sobre o serviço/produto campeão de vendas e por que ele é o queridinho do público.", examples: ["O serviço/produto que todos amam (e por quê)", "Detalhes do resultado mais procurado", "O pacote/plano que resolve o maior problema."] },
  { title: "Conte algo curioso sobre sua marca.", desc: "Histórias geram conexão. Compartilhe a origem do nome ou uma inspiração.", examples: ["A história por trás do nome da empresa", "O desafio inusitado que marcou o início", "De onde veio a inspiração inicial para o negócio."] },
  { title: "Mostre um antes e depois da transformação.", desc: "Foque na transformação visual ou de resultado que você entrega.", examples: ["O resultado final vs. o ponto de partida do cliente", "A evolução de um projeto longo", "A diferença que o seu método faz no resultado final."] },
  { title: "Faça uma enquete simples e relevante.", desc: "Aumente o engajamento pedindo a opinião do seu público.", examples: ["Pergunte sobre o maior desafio do público hoje", "'Sim ou Não' sobre uma crença do mercado", "Qual das suas soluções o público prefere."] },
  { title: "Agradeça seus clientes.", desc: "Uma mensagem de gratidão sincera cria laços e humaniza sua marca.", examples: ["Mensagem sincera de gratidão pelo apoio", "Celebre uma meta alcançada com o público (ex: 100 projetos)", "Destaque um cliente ou parceiro fiel."] },
  { title: "Mostre sua equipe em ação.", desc: "Apresente quem está por trás do seu negócio, mesmo que seja só você!", examples: ["O time (ou você) em um momento de foco/colaboração", "Apresente rapidamente um membro da equipe", "O ritual de happy hour ou almoço."] },
  { title: "Mostre algo que te inspira.", desc: "Compartilhe suas referências, livros, ou fontes de motivação profissional.", examples: ["O livro/podcast que você está consumindo", "Uma referência de design/serviço que te move", "O mentor ou profissional que te influencia."] },
  { title: "Responda uma pergunta frequente (FAQ).", desc: "Economize tempo e eduque seu público resolvendo dúvidas comuns.", examples: ["Responda à dúvida mais comum sobre preços/processos", "Explique o melhor momento para contratar seu serviço", "Desmistifique um tabu do seu mercado."] },
  { title: "Destaque um valor da sua empresa.", desc: "Qual é o pilar da sua marca? (Rapidez, sustentabilidade, qualidade, expertise, etc.)", examples: ["Fale sobre seu compromisso com a rapidez/qualidade", "Explique a ética por trás da sua produção/serviço", "O que significa a palavra 'confiança' para sua marca."] },
  { title: "Mostre algo novo que chegou/atualizou.", desc: "Crie senso de novidade e urgência para gerar interesse.", examples: ["Uma nova metodologia de trabalho/produção", "Um recurso recém-adicionado a um software/serviço", "Uma versão aprimorada do seu produto/solução principal."] },
  { title: "Inicie uma mini-série (Parte 1).", desc: "Crie expectativa para os próximos dias com um conteúdo dividido em partes.", examples: ["'O que ninguém te conta sobre...' (Parte 1)", "O primeiro passo de 3 para resolver [problema]", "O início do processo de criação de [grande projeto]."] },
  { title: "Poste um meme ou GIF relacionado ao nicho.", desc: "Use humor leve para se conectar e mostrar que você entende as dores do público.", examples: ["Use humor para aliviar a dor do cliente", "Uma piada que só quem é do seu mercado entende", "Reaja com um GIF a uma notícia do seu segmento."] },
  { title: "Fale sobre a jornada do cliente.", desc: "Descreva a experiência que o cliente percorre desde o primeiro contato até o pós-venda.", examples: ["Mostre o caminho que o cliente percorre para obter sucesso", "O que acontece depois que ele diz 'sim'", "Os pontos de suporte e acompanhamento."] },
  { title: "Mostre a atmosfera ideal do seu espaço.", desc: "Crie uma sensação de paz e mostre a beleza do seu ambiente antes da correria do dia.", examples: ["O ambiente limpo e pronto para o expediente", "A vista que serve de inspiração", "Uma decoração ou arranjo que facilita o foco/criação."] },
  { title: "Faça um story com 'Perguntas e Respostas'.", desc: "Abra a caixinha de perguntas para interagir diretamente e criar conteúdo relevante.", examples: ["Abra a caixinha e responda ao vivo/em texto", "Peça sugestões de novos temas de conteúdo", "Peça para o público contar o que eles mais valorizam em você."] },
  { title: "Compartilhe um objetivo de curto prazo.", desc: "Mostre transparência e motive seu público a acompanhar suas conquistas.", examples: ["A meta de vendas/produção desta semana", "O que você está estudando/implementando agora", "O desafio que você se impôs para o próximo mês."] },
  { title: "Documente uma etapa crucial do processo de entrega/execução.", desc: "Dê valor ao cuidado e atenção que você coloca em cada projeto ou serviço.", examples: ["O processo de conferência de qualidade final", "A fase de testes e ajustes (beta)", "O passo a passo para iniciar a produção/criação."] },
  { title: "Destaque um serviço complementar.", desc: "Apresente algo que seu cliente pode adquirir junto para ter uma experiência completa.", examples: ["O acessório/add-on que maximiza o resultado", "O serviço 'premium' que transforma a experiência", "O 'combo' de soluções que oferece valor total."] },
  { title: "Faça um mini-tutorial de uso/aplicação.", desc: "Ensine o cliente a tirar o máximo proveito do que ele comprou ou contratou.", examples: ["Como otimizar o uso do seu serviço/produto", "O que fazer nos primeiros 7 dias após a compra/contratação", "Como agendar o próximo passo do seu serviço."] },
  { title: "Crie um desafio ou CTA para o público.", desc: "Peça para o público fazer algo: comentar, compartilhar, marcar um amigo.", examples: ["Peça para o público marcar 3 amigos que precisam de ajuda", "Incentive a comentar a postagem anterior com uma opinião", "Sugira usar uma hashtag da sua marca."] },
  { title: "Mostre um erro/fracasso e o que aprendeu.", desc: "Vulnerabilidade gera confiança. Mostre que errar faz parte do processo de crescimento.", examples: ["Um projeto que deu errado e o que foi corrigido", "A maior lição que você tirou de um momento difícil", "Um mito que você acreditava e que desvendou."] },
  { title: "Mostre um item de trabalho favorito.", desc: "Destaque a ferramenta, software ou objeto que mais te ajuda a entregar o melhor.", examples: ["A ferramenta/software que mais economiza seu tempo", "Seu objeto pessoal que te dá sorte/foco", "O equipamento que mudou a qualidade do seu trabalho."] },
  { title: "Faça uma recomendação de parceiro.", desc: "Apoie a comunidade e gere reciprocidade, indicando um negócio complementar.", examples: ["Indique um fornecedor de qualidade da sua cadeia", "Recomende um negócio local que se alinha aos seus valores", "Destaque um colega de outra área complementar."] },
  { title: "Crie um 'Você sabia?' (Fato divertido).", desc: "Use um fato pouco conhecido sobre seu nicho ou história da empresa para educar e entreter.", examples: ["Um dado estatístico surpreendente do seu mercado", "Um fato histórico pouco conhecido sobre seu nicho", "Uma curiosidade sobre o seu processo de criação."] },
  { title: "Destaque um recurso ou benefício secundário que gera grande valor.", desc: "Aquele pequeno extra que muitas vezes passa despercebido, mas tem muito valor para o cliente.", examples: ["A política de devolução/revisão que traz tranquilidade", "O suporte dedicado que faz a diferença", "A garantia que você oferece após a conclusão."] },
  { title: "Compartilhe uma citação inspiradora.", desc: "Use a palavra de alguém que te move para motivar seu público.", examples: ["Uma frase motivacional para começar a semana", "Citação de um líder que você admira", "Seu lema pessoal pessoal sobre sucesso/trabalho duro."] },
  { title: "Faça um resumo das conquistas do mês.", desc: "Olhe para trás e celebre os pequenos ou grandes sucessos de forma transparente.", examples: ["Celebre os 3 maiores acertos do mês", "Revise as metas alcançadas e as que faltam", "Agradeça a quem contribuiu para o seu sucesso."] },
];

/**
 * Utilitário para formatar a data como YYYY-MM-DD (para uso no Firestore)
 * @param {Date} date
 * @returns {string}
 */
const formatDate = (date) => date.toISOString().split('T')[0];

// Função auxiliar para copiar texto para a área de transferência
const copyToClipboard = (text) => {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text);
  } else {
    // Fallback para ambientes restritos (como iframe)
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = 0;
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
      document.execCommand('copy');
    } catch (err) {
      console.error('Falha ao copiar:', err);
    }
    document.body.removeChild(textarea);
  }
};


// --- COMPONENTE: MODAL DE SUCESSO ---
const SuccessModal = ({ isOpen, onClose, missionTitle }) => {
  if (!isOpen) return null;

  // A função de copiar texto foi removida por solicitação do usuário.
  // O modal agora apenas confirma a conclusão.

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 transition-opacity duration-300">
      <div className="bg-[#1a1a1a] p-6 rounded-2xl max-w-sm w-full shadow-2xl transform scale-100 transition-transform duration-300 border-t-4 border-green-500">
        <div className="text-center">
          <span className="text-4xl block mb-4">✨</span>
          <h3 className="text-2xl font-bold text-white mb-2">Missão Cumprida!</h3>
          <p className="text-gray-400 mb-4 text-sm">
            Seu progresso foi registrado. Excelente trabalho na missão de hoje:
          </p>
          <p className="font-semibold text-green-500 mb-6 italic">
            "{missionTitle}"
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-full font-bold text-gray-900 bg-yellow-500 hover:bg-yellow-400 transition duration-200 shadow-lg shadow-yellow-700/50"
        >
          Entendi, Próximo Desafio!
        </button>
      </div>
    </div>
  );
};


// --- COMPONENTE PRINCIPAL ---
const App = () => {
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [userProfile, setUserProfile] = useState({});
  const [missionsProgress, setMissionsProgress] = useState({});
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('home'); // 'home', 'history', 'profile'
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false); // Novo estado para o Modal
  const [toast, setToast] = useState(''); // Mantido para feedback secundário (ex: salvar perfil)

  // 1. Inicialização do Firebase e Autenticação
  useEffect(() => {
    try {
      const app = initializeApp(firebaseConfig);
      const firestore = getFirestore(app);
      const authInstance = getAuth(app);
      setDb(firestore);
      setAuth(authInstance);

      // Tenta login com token inicial ou anônimo, se o token não existir
      if (initialAuthToken) {
        signInWithCustomToken(authInstance, initialAuthToken).catch(e => {
          console.error("Erro ao autenticar com token customizado, tentando anônimo:", e);
          signInAnonymously(authInstance);
        });
      } else {
        signInAnonymously(authInstance);
      }

      // Listener de estado de autenticação
      const unsubscribe = onAuthStateChanged(authInstance, (user) => {
        if (user) {
          setUserId(user.uid);
        } else {
          setUserId(null);
        }
        setIsAuthReady(true);
        setLoading(false);
      });
      return () => unsubscribe();
    } catch (e) {
      console.error("Erro ao inicializar Firebase:", e);
      setLoading(false);
      setIsAuthReady(true);
    }
  }, []);

  // 2. Fetch e Listeners do Firestore (Missões e Perfil)
  useEffect(() => {
    if (!db || !userId || !isAuthReady) return;

    const userMissionsPath = `/artifacts/${appId}/users/${userId}/potiguar_missions`;
    const progressDocRef = doc(db, userMissionsPath, 'progress');
    const profileDocRef = doc(db, userMissionsPath, 'profile');

    // Listener para o progresso das missões
    const unsubscribeProgress = onSnapshot(progressDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setMissionsProgress(docSnap.data());
      } else {
        setMissionsProgress({});
      }
    }, (error) => console.error("Erro ao ouvir progresso:", error));

    // Listener para o perfil do usuário
    const unsubscribeProfile = onSnapshot(profileDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setUserProfile(docSnap.data());
      } else {
        // Inicializa o perfil com dados básicos do Google Auth
        const initialProfile = {
          name: auth.currentUser?.displayName || 'Cliente Potiguar',
          email: auth.currentUser?.email || '',
          company: '',
          instagram: '',
        };
        setUserProfile(initialProfile);
        setDoc(profileDocRef, initialProfile, { merge: true }).catch(e => console.error("Erro ao salvar perfil inicial:", e));
      }
    }, (error) => console.error("Erro ao ouvir perfil:", error));

    return () => {
      unsubscribeProgress();
      unsubscribeProfile();
    };
  }, [db, userId, isAuthReady]);

  // --- LÓGICA DE DATA E MISSÃO ATUAL ---

  // Obtém a data atual no fuso horário de Fortaleza/Natal (UTC-3)
  const getTodayDate = useCallback(() => {
    const now = new Date();
    // Ajuste simples para o fuso horário (aproximadamente -3h)
    const localTime = new Date(now.getTime() - 3 * 3600000); // 3 horas em milissegundos
    return formatDate(localTime);
  }, []);
  
  const todayDate = getTodayDate();
  
  // Calcula o índice da missão (0 a 29) baseado no dia do mês
  const missionIndex = useMemo(() => {
    const dayOfMonth = new Date().getDate();
    return (dayOfMonth - 1) % 30; // Garante que o índice esteja entre 0 e 29
  }, []);
  
  const currentMission = dailyMissions[missionIndex];
  
  const missionStatus = missionsProgress[todayDate]?.status || 'pending';
  
  // Função para marcar a missão como cumprida
  const handleMissionComplete = useCallback(async () => {
    if (!db || !userId || missionStatus === 'fulfilled' || !currentMission) return;
    
    const userMissionsPath = `/artifacts/${appId}/users/${userId}/potiguar_missions`;
    const progressDocRef = doc(db, userMissionsPath, 'progress');
    
    const dataToSave = {
      [todayDate]: {
        status: 'fulfilled',
        title: currentMission.title,
        completedAt: new Date().toISOString(),
        index: missionIndex
      }
    };
    
    try {
      await updateDoc(progressDocRef, dataToSave);
      
      // === PONTO DE INTEGRAÇÃO COM NOTIFICAÇÃO DO ADMINISTRADOR ===
      // Neste ponto, um Firebase Cloud Function (ou Cloudflare Worker, etc.) deve ser acionado
      // usando o trigger 'onUpdate' no documento 'progress' do Firestore.
      // O backend detectaria a mudança de status para 'fulfilled' e enviaria a notificação
      // (e-mail/Slack/Webhook) contendo o 'userId' e o 'currentMission.title'.
      // O frontend apenas abre o modal de sucesso.
      
      setIsModalOpen(true); 
    } catch (e) {
      if (e.code === 'not-found') {
        await setDoc(progressDocRef, dataToSave);
        setIsModalOpen(true);
      } else {
        console.error("Erro ao completar missão:", e);
        setToast('❌ Erro ao salvar a missão.');
      }
    }
  }, [db, userId, todayDate, missionStatus, currentMission, missionIndex]);

  // Função para salvar o perfil
  const handleProfileSave = useCallback(async (newProfile) => {
    if (!db || !userId) return;

    const userMissionsPath = `/artifacts/${appId}/users/${userId}/potiguar_missions`;
    const profileDocRef = doc(db, userMissionsPath, 'profile');
    
    try {
      await updateDoc(profileDocRef, newProfile);
      setUserProfile(newProfile);
      setToast('💾 Perfil Atualizado com Sucesso!');
    } catch (e) {
      console.error("Erro ao salvar perfil:", e);
      setToast('❌ Erro ao salvar o perfil.');
    }
  }, [db, userId]);

  // Função para login Google
  const handleGoogleLogin = useCallback(() => {
    if (!auth) return;
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider)
      .catch((error) => {
        console.error("Erro no login Google:", error);
        setToast('❌ Falha na autenticação Google.');
      });
  }, [auth]);

  // --- Componente: TOAST MESSAGE (Mantido apenas para notificações secundárias) ---
  const Toast = ({ message, setToast }) => {
    useEffect(() => {
      if (message) {
        const timer = setTimeout(() => {
          setToast('');
        }, 3000);
        return () => clearTimeout(timer);
      }
    }, [message, setToast]);

    if (!message) return null;

    return (
      <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300">
        <div className="bg-yellow-600 text-white p-3 rounded-xl shadow-lg font-medium text-sm">
          {message}
        </div>
      </div>
    );
  };
  
  // --- Componente: HOME/MISSÃO DO DIA ---
  const MissionCard = () => {
    const isCompleted = missionStatus === 'fulfilled';
    
    // O botão de copiar foi removido por solicitação
    
    return (
      <div className="p-4 sm:p-6 md:p-8">
        <h1 className="text-3xl font-extrabold text-white mb-2">
          Missão de Hoje
        </h1>
        <p className="text-gray-400 mb-6 text-sm">
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>

        <div className="bg-[#1a1a1a] p-6 rounded-2xl shadow-xl transition-all duration-500 hover:shadow-yellow-900/40">
          <h2 className="text-2xl font-bold mb-3 text-white" style={{ color: ACCENT_COLOR }}>
            {currentMission.title}
          </h2>
          <p className="text-gray-300 mb-5 border-l-4 pl-3 border-yellow-500/50 italic">
            {currentMission.desc}
          </p>

          <h3 className="text-lg font-semibold text-white mt-6 mb-2">Ideias Práticas:</h3>
          <ul className="list-disc list-inside space-y-1 text-gray-400 ml-2">
            {currentMission.examples.map((ex, i) => (
              <li key={i} className="text-sm">
                {ex}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-8 flex flex-col items-center justify-center">
          <button
            onClick={handleMissionComplete}
            disabled={isCompleted}
            className={`
              w-full max-w-sm px-6 py-4 rounded-full font-extrabold text-xl transition-all duration-300 transform shadow-lg
              ${isCompleted
                ? 'bg-green-700 text-white cursor-not-allowed shadow-green-900/50'
                : 'bg-yellow-500 text-gray-900 hover:bg-yellow-400 active:scale-95 shadow-yellow-700/70'}
            `}
          >
            {isCompleted ? '✅ Missão Cumprida!' : 'Marcar Missão Cumprida'}
          </button>
        </div>
      </div>
    );
  };

  // --- Componente: HISTÓRICO ---
  const HistoryView = () => {
    // Cria uma lista dos últimos 30 dias para exibir
    const historyList = useMemo(() => {
      const list = [];
      const today = new Date();

      for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateString = formatDate(date);
        
        // Determina o status
        const progress = missionsProgress[dateString];
        let status;
        let missionTitle = dailyMissions[(new Date(date).getDate() - 1) % 30].title;
        
        if (progress?.status === 'fulfilled') {
          status = 'fulfilled'; // Cumprida ✅
          missionTitle = progress.title;
        } else if (dateString < todayDate) {
          status = 'missed'; // Perdida ❌
        } else if (dateString === todayDate) {
          status = 'pending'; // Pendente
        } else {
          status = 'future'; // Futura
        }

        list.push({
          date: date.toLocaleDateString('pt-BR'),
          dateString,
          title: missionTitle,
          status: status,
        });
      }
      return list;
    }, [missionsProgress, todayDate]);

    // Renderiza um item do histórico
    const HistoryItem = ({ item }) => {
      let bgColor = '';
      let statusText = '';
      let statusIcon = '';
      let titleColor = 'text-gray-300';

      switch (item.status) {
        case 'fulfilled':
          bgColor = 'bg-green-800/20';
          statusText = 'Cumprida';
          statusIcon = '✅';
          titleColor = 'text-white font-semibold';
          break;
        case 'missed':
          bgColor = 'bg-red-800/20';
          statusText = 'Perdida';
          statusIcon = '❌';
          titleColor = 'text-gray-400 line-through';
          break;
        case 'pending':
          bgColor = 'bg-yellow-800/20 border-l-4 border-yellow-500';
          statusText = 'Pendente';
          statusIcon = '⏳';
          titleColor = 'text-white font-semibold';
          break;
        default: // 'future'
          bgColor = 'bg-gray-800/20';
          statusText = 'Futura';
          statusIcon = '🗓️';
          titleColor = 'text-gray-500 italic';
          break;
      }

      return (
        <div className={`p-4 rounded-xl mb-3 flex justify-between items-center transition duration-200 ${bgColor}`}>
          <div className="flex-1 min-w-0 pr-4">
            <p className="text-xs text-gray-500 mb-1">{item.date}</p>
            <p className={`text-sm truncate ${titleColor}`}>{item.title}</p>
          </div>
          <div className="flex-shrink-0 text-right">
            <span className="text-xl">{statusIcon}</span>
            <span className="ml-2 text-xs font-medium text-gray-400 hidden sm:inline">{statusText}</span>
          </div>
        </div>
      );
    };

    return (
      <div className="p-4 sm:p-6 md:p-8">
        <h1 className="text-3xl font-extrabold text-white mb-2">
          Histórico de Missões
        </h1>
        <p className="text-gray-400 mb-6 text-sm">
          Veja seu desempenho nos últimos 30 dias.
        </p>
        
        <div className="bg-[#1a1a1a] p-4 rounded-2xl shadow-xl max-h-[70vh] overflow-y-auto custom-scrollbar">
          {historyList.map((item) => (
            <HistoryItem key={item.dateString} item={item} />
          ))}
        </div>
        <style jsx="true">{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 8px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background-color: ${ACCENT_COLOR}33; /* Amarelo semi-transparente */
            border-radius: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: #2c2c2c;
          }
        `}</style>
      </div>
    );
  };

  // --- Componente: PERFIL ---
  const ProfileView = () => {
    const [localProfile, setLocalProfile] = useState(userProfile);
    
    useEffect(() => {
      setLocalProfile(userProfile);
    }, [userProfile]);

    const handleChange = (e) => {
      const { name, value } = e.target;
      setLocalProfile(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = (e) => {
      e.preventDefault();
      handleProfileSave(localProfile);
    };

    // Estilo de Input comum
    const InputStyle = "w-full p-3 rounded-lg bg-[#2c2c2c] border border-gray-700 text-white placeholder-gray-500 focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500 transition duration-150";

    return (
      <div className="p-4 sm:p-6 md:p-8">
        <h1 className="text-3xl font-extrabold text-white mb-2">
          Meu Perfil
        </h1>
        <p className="text-gray-400 mb-6 text-sm">
          Ajuste seus dados para referência interna. Seu ID de Usuário é: <span className="text-yellow-500 break-all">{userId}</span>
        </p>

        <form onSubmit={handleSave} className="space-y-4 bg-[#1a1a1a] p-6 rounded-2xl shadow-xl">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">Nome:</label>
            <input
              type="text"
              name="name"
              value={localProfile.name || ''}
              onChange={handleChange}
              className={InputStyle}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">Email (Google):</label>
            <input
              type="email"
              name="email"
              value={localProfile.email || ''}
              readOnly
              className={`${InputStyle} opacity-70 cursor-not-allowed`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">Empresa/Marca:</label>
            <input
              type="text"
              name="company"
              value={localProfile.company || ''}
              onChange={handleChange}
              placeholder="Ex: Potiguar Criativa"
              className={InputStyle}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">@ Instagram (Opcional):</label>
            <input
              type="text"
              name="instagram"
              value={localProfile.instagram || ''}
              onChange={handleChange}
              placeholder="Ex: @potiguarcriativa"
              className={InputStyle}
            />
          </div>

          <button
            type="submit"
            className="w-full px-6 py-3 rounded-full font-bold text-lg transition-all duration-300 transform bg-yellow-500 text-gray-900 hover:bg-yellow-400 active:scale-95 shadow-lg shadow-yellow-700/70 mt-6"
          >
            Salvar Alterações
          </button>
        </form>
      </div>
    );
  };
  
  // --- Componente: NAVBAR/RODAPÉ (Ícones Modernizados) ---
  const NavBar = ({ currentPage, setCurrentPage }) => {
    
    // SVGs para ícones modernos (substituindo os emojis)
    const icons = {
      home: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
          <path d="M13 2v10l3-3 7 7-7 7-3-3V2zM11 22v-8h-4v8H3V6h4l3 3 4-4V2z" />
        </svg>
      ), // Representa Foco/Ação (Lightning/Zap)
      history: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
          <path d="M3 15h4v6H3zM10 9h4v12h-4zM17 3h4v18h-4z"/>
        </svg>
      ), // Representa Timeline/Estatísticas
      profile: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ), // Representa Usuário/Perfil
    };

    const NavButton = ({ page, label }) => {
      const isActive = currentPage === page;
      return (
        <button
          onClick={() => setCurrentPage(page)}
          className={`
            flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-300
            ${isActive ? 'text-yellow-500' : 'text-gray-400 hover:text-white'}
          `}
        >
          {icons[page]}
          <span className="text-xs mt-1 font-medium">{label}</span>
        </button>
      );
    };

    return (
      <footer className="fixed bottom-0 left-0 right-0 bg-[#1c1c1c] border-t border-gray-800 shadow-2xl z-40">
        <div className="flex justify-around max-w-lg mx-auto py-2">
          <NavButton page="home" label="Ação" />
          <NavButton page="history" label="Histórico" />
          <NavButton page="profile" label="Perfil" />
        </div>
      </footer>
    );
  };

  // --- Renderização Principal ---
  
  if (loading || !isAuthReady) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: ACCENT_COLOR }}></div>
        <p className="mt-4 text-white">Carregando Missões...</p>
      </div>
    );
  }

  // Tela de Autenticação/Login
  if (userId && auth && auth.currentUser.isAnonymous) {
     return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ backgroundColor: BG_COLOR }}>
          <div className="max-w-md w-full bg-[#1a1a1a] p-8 rounded-2xl shadow-2xl text-center">
            <h1 className="text-3xl font-bold mb-4 text-white" style={{ color: ACCENT_COLOR }}>
              Potiguar Creativa
            </h1>
            <p className="text-xl font-semibold mb-6 text-gray-300">
              Missões do Dia
            </p>
            <p className="text-gray-400 mb-8">
              Entre com sua conta Google para salvar seu progresso e perfil de forma segura.
            </p>
            <button
              onClick={handleGoogleLogin}
              className="w-full px-6 py-3 rounded-full font-bold text-gray-900 bg-white hover:bg-gray-200 transition duration-200 flex items-center justify-center shadow-lg shadow-white/20"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-2" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.341c-1.429 3.472-3.896 6.397-6.861 8.358L37.1 40.751C41.259 37.94 43.611 32.774 43.611 28c0-2.695-.5-5.228-1.353-7.917z"/><path fill="#FF3D00" d="M12 28.341C12 30.65 12.646 32.887 13.731 34.851L6.21 40.751C4.407 37.07 3.39 33.15 3.39 28s1.017-9.07 2.82-12.751L13.731 21.149C12.646 23.113 12 25.35 12 28.341z"/><path fill="#4CAF50" d="M24 8c3.085 0 5.865 1.139 7.87 2.99l7.005-7.005C35.152 2.671 30.08 0 24 0c-4.401 0-8.497 1.34-11.79 3.758L20.13 8.16C21.725 8.067 22.87 8 24 8z"/><path fill="#1976D2" d="M41.358 40.751L37.1 34.851c-2.965-1.961-5.432-4.886-6.861-8.358H24v-8h17.611c.854 2.69 1.353 5.228 1.353 7.917C43.611 32.774 41.259 37.94 37.1 40.751z"/></svg>
              Entrar com Google
            </button>
            <p className="mt-4 text-xs text-gray-600">
              O progresso anônimo não é garantido.
            </p>
          </div>
          <Toast message={toast} setToast={setToast} />
        </div>
      );
  }

  // Conteúdo Principal
  const renderContent = () => {
    switch (currentPage) {
      case 'history':
        return <HistoryView />;
      case 'profile':
        return <ProfileView />;
      case 'home':
      default:
        return <MissionCard />;
    }
  };

  return (
    <div className="min-h-screen pb-20 font-sans" style={{ backgroundColor: BG_COLOR, color: TEXT_COLOR }}>
      <div className="max-w-lg mx-auto">
        <header className="pt-8 px-4 text-center">
          <h1 className="text-lg font-light text-gray-500">
            Potiguar Creativa
          </h1>
          <p className="text-3xl font-extrabold" style={{ color: ACCENT_COLOR }}>
            Missões do Dia
          </p>
        </header>

        <main className="pb-6">
          {renderContent()}
        </main>
      </div>
      
      <NavBar currentPage={currentPage} setCurrentPage={setCurrentPage} />
      <SuccessModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        missionTitle={currentMission?.title || ''}
      />
      <Toast message={toast} setToast={setToast} />
    </div>
  );
};

export default App;
›

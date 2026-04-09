// Multi-language translation system for employee-facing UI
// Supported languages: English (en), Spanish (es), French (fr), Portuguese (pt), 
// Chinese (zh), Vietnamese (vi), Korean (ko), Tagalog (tl)

export const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English", nativeName: "English", flag: "🇺🇸" },
  { code: "es", name: "Spanish", nativeName: "Español", flag: "🇪🇸" },
  { code: "fr", name: "French", nativeName: "Français", flag: "🇫🇷" },
  { code: "pt", name: "Portuguese", nativeName: "Português", flag: "🇧🇷" },
  { code: "zh", name: "Chinese", nativeName: "中文", flag: "🇨🇳" },
  { code: "vi", name: "Vietnamese", nativeName: "Tiếng Việt", flag: "🇻🇳" },
  { code: "ko", name: "Korean", nativeName: "한국어", flag: "🇰🇷" },
  { code: "tl", name: "Tagalog", nativeName: "Tagalog", flag: "🇵🇭" }
];

export const DEFAULT_LANGUAGE = "en";

// UI text translations organized by category
export const translations = {
  // Common/shared UI elements
  common: {
    employees: {
      en: "Employees",
      es: "Empleados",
      fr: "Employés",
      pt: "Funcionários",
      zh: "员工",
      vi: "Nhân viên",
      ko: "직원",
      tl: "Mga Empleyado"
    },
    loading: {
      en: "Loading...",
      es: "Cargando...",
      fr: "Chargement...",
      pt: "Carregando...",
      zh: "加载中...",
      vi: "Đang tải...",
      ko: "로딩 중...",
      tl: "Naglo-load..."
    },
    save: {
      en: "Save",
      es: "Guardar",
      fr: "Enregistrer",
      pt: "Salvar",
      zh: "保存",
      vi: "Lưu",
      ko: "저장",
      tl: "I-save"
    },
    cancel: {
      en: "Cancel",
      es: "Cancelar",
      fr: "Annuler",
      pt: "Cancelar",
      zh: "取消",
      vi: "Hủy",
      ko: "취소",
      tl: "Kanselahin"
    },
    submit: {
      en: "Submit",
      es: "Enviar",
      fr: "Soumettre",
      pt: "Enviar",
      zh: "提交",
      vi: "Gửi",
      ko: "제출",
      tl: "Isumite"
    },
    confirm: {
      en: "Confirm",
      es: "Confirmar",
      fr: "Confirmer",
      pt: "Confirmar",
      zh: "确认",
      vi: "Xác nhận",
      ko: "확인",
      tl: "Kumpirmahin"
    },
    back: {
      en: "Back",
      es: "Atrás",
      fr: "Retour",
      pt: "Voltar",
      zh: "返回",
      vi: "Quay lại",
      ko: "뒤로",
      tl: "Bumalik"
    },
    next: {
      en: "Next",
      es: "Siguiente",
      fr: "Suivant",
      pt: "Próximo",
      zh: "下一步",
      vi: "Tiếp theo",
      ko: "다음",
      tl: "Susunod"
    },
    done: {
      en: "Done",
      es: "Listo",
      fr: "Terminé",
      pt: "Concluído",
      zh: "完成",
      vi: "Hoàn thành",
      ko: "완료",
      tl: "Tapos na"
    },
    yes: {
      en: "Yes",
      es: "Sí",
      fr: "Oui",
      pt: "Sim",
      zh: "是",
      vi: "Có",
      ko: "예",
      tl: "Oo"
    },
    no: {
      en: "No",
      es: "No",
      fr: "Non",
      pt: "Não",
      zh: "否",
      vi: "Không",
      ko: "아니오",
      tl: "Hindi"
    },
    search: {
      en: "Search",
      es: "Buscar",
      fr: "Rechercher",
      pt: "Pesquisar",
      zh: "搜索",
      vi: "Tìm kiếm",
      ko: "검색",
      tl: "Maghanap"
    },
    filter: {
      en: "Filter",
      es: "Filtrar",
      fr: "Filtrer",
      pt: "Filtrar",
      zh: "筛选",
      vi: "Lọc",
      ko: "필터",
      tl: "Salain"
    },
    all: {
      en: "All",
      es: "Todos",
      fr: "Tous",
      pt: "Todos",
      zh: "全部",
      vi: "Tất cả",
      ko: "모두",
      tl: "Lahat"
    },
    of: {
      en: "of",
      es: "de",
      fr: "sur",
      pt: "de",
      zh: "共",
      vi: "trong số",
      ko: "중",
      tl: "sa"
    },
    none: {
      en: "None",
      es: "Ninguno",
      fr: "Aucun",
      pt: "Nenhum",
      zh: "无",
      vi: "Không có",
      ko: "없음",
      tl: "Wala"
    },
    hide: {
      en: "Hide",
      es: "Ocultar",
      fr: "Masquer",
      pt: "Ocultar",
      zh: "隐藏",
      vi: "Ẩn",
      ko: "숨기기",
      tl: "Itago"
    },
    view: {
      en: "View",
      es: "Ver",
      fr: "Voir",
      pt: "Ver",
      zh: "查看",
      vi: "Xem",
      ko: "보기",
      tl: "Tingnan"
    },
    map: {
      en: "Map",
      es: "Mapa",
      fr: "Carte",
      pt: "Mapa",
      zh: "地图",
      vi: "Bản đồ",
      ko: "지도",
      tl: "Mapa"
    },
    continue: {
      en: "Continue",
      es: "Continuar",
      fr: "Continuer",
      pt: "Continuar",
      zh: "继续",
      vi: "Tiếp tục",
      ko: "계속",
      tl: "Magpatuloy"
    },
    start: {
      en: "Start",
      es: "Iniciar",
      fr: "Démarrer",
      pt: "Iniciar",
      zh: "开始",
      vi: "Bắt đầu",
      ko: "시작",
      tl: "Simulan"
    },
    record: {
      en: "Record",
      es: "Registrar",
      fr: "Enregistrer",
      pt: "Registrar",
      zh: "记录",
      vi: "Ghi lại",
      ko: "기록",
      tl: "I-record"
    },
    required: {
      en: "Required",
      es: "Requerido",
      fr: "Requis",
      pt: "Obrigatório",
      zh: "必填",
      vi: "Bắt buộc",
      ko: "필수",
      tl: "Kinakailangan"
    },
    optional: {
      en: "Optional",
      es: "Opcional",
      fr: "Optionnel",
      pt: "Opcional",
      zh: "可选",
      vi: "Tùy chọn",
      ko: "선택",
      tl: "Opsyonal"
    },
    available: {
      en: "available",
      es: "disponible",
      fr: "disponible",
      pt: "disponível",
      zh: "可用",
      vi: "có sẵn",
      ko: "사용 가능",
      tl: "available"
    },
    selectAll: {
      en: "Select All",
      es: "Seleccionar Todo",
      fr: "Tout Sélectionner",
      pt: "Selecionar Tudo",
      zh: "全选",
      vi: "Chọn tất cả",
      ko: "모두 선택",
      tl: "Piliin Lahat"
    },
    taken: {
      en: "Taken",
      es: "Ocupado",
      fr: "Pris",
      pt: "Ocupado",
      zh: "已占用",
      vi: "Đã lấy",
      ko: "선택됨",
      tl: "Nakuha na"
    },
    locations: {
      en: "locations",
      es: "ubicaciones",
      fr: "emplacements",
      pt: "locais",
      zh: "位置",
      vi: "vị trí",
      ko: "위치",
      tl: "mga lokasyon"
    },
    toComplete: {
      en: "to complete",
      es: "por completar",
      fr: "à compléter",
      pt: "a completar",
      zh: "待完成",
      vi: "để hoàn thành",
      ko: "완료 예정",
      tl: "para tapusin"
    },
    confirmSelection: {
      en: "Confirm Selection",
      es: "Confirmar Selección",
      fr: "Confirmer la Sélection",
      pt: "Confirmar Seleção",
      zh: "确认选择",
      vi: "Xác nhận lựa chọn",
      ko: "선택 확인",
      tl: "Kumpirmahin ang Pinili"
    },
    selected: {
      en: "selected",
      es: "seleccionados",
      fr: "sélectionnés",
      pt: "selecionados",
      zh: "已选择",
      vi: "đã chọn",
      ko: "선택됨",
      tl: "napili"
    },
    delete: {
      en: "Delete",
      es: "Eliminar",
      fr: "Supprimer",
      pt: "Excluir",
      zh: "删除",
      vi: "Xóa",
      ko: "삭제",
      tl: "Tanggalin"
    },
    from: {
      en: "From",
      es: "De",
      fr: "De",
      pt: "De",
      zh: "来自",
      vi: "Từ",
      ko: "발신",
      tl: "Mula kay"
    },
    outOf: {
      en: "out of",
      es: "de",
      fr: "sur",
      pt: "de",
      zh: "共",
      vi: "trên",
      ko: "중",
      tl: "sa"
    },
    tryAgain: {
      en: "Try Again",
      es: "Intentar de Nuevo",
      fr: "Réessayer",
      pt: "Tentar Novamente",
      zh: "重试",
      vi: "Thử lại",
      ko: "다시 시도",
      tl: "Subukan Muli"
    },
    submitting: {
      en: "Submitting...",
      es: "Enviando...",
      fr: "Envoi en cours...",
      pt: "Enviando...",
      zh: "提交中...",
      vi: "Đang gửi...",
      ko: "제출 중...",
      tl: "Isinusumite..."
    },
    anonymous: {
      en: "Anonymous",
      es: "Anónimo",
      fr: "Anonyme",
      pt: "Anônimo",
      zh: "匿名",
      vi: "Ẩn danh",
      ko: "익명",
      tl: "Anonymous"
    },
    new: {
      en: "New",
      es: "Nuevo",
      fr: "Nouveau",
      pt: "Novo",
      zh: "新",
      vi: "Mới",
      ko: "새로운",
      tl: "Bago"
    },
    gotIt: {
      en: "Got it",
      es: "Entendido",
      fr: "Compris",
      pt: "Entendi",
      zh: "知道了",
      vi: "Đã hiểu",
      ko: "알겠습니다",
      tl: "Sige"
    },
    clear: {
      en: "Clear",
      es: "Borrar",
      fr: "Effacer",
      pt: "Limpar",
      zh: "清除",
      vi: "Xóa",
      ko: "지우기",
      tl: "Burahin"
    },
    optional: {
      en: "optional",
      es: "opcional",
      fr: "optionnel",
      pt: "opcional",
      zh: "可选",
      vi: "tùy chọn",
      ko: "선택",
      tl: "opsyonal"
    },
    saved: {
      en: "Saved!",
      es: "¡Guardado!",
      fr: "Enregistré!",
      pt: "Salvo!",
      zh: "已保存！",
      vi: "Đã lưu!",
      ko: "저장됨!",
      tl: "Na-save!"
    },
    savedSuccessfully: {
      en: "Saved successfully",
      es: "Guardado exitosamente",
      fr: "Enregistré avec succès",
      pt: "Salvo com sucesso",
      zh: "保存成功",
      vi: "Đã lưu thành công",
      ko: "저장 성공",
      tl: "Matagumpay na na-save"
    }
  },

  // Dashboard and navigation
  dashboard: {
    welcome: {
      en: "Welcome",
      es: "Bienvenido",
      fr: "Bienvenue",
      pt: "Bem-vindo",
      zh: "欢迎",
      vi: "Chào mừng",
      ko: "환영합니다",
      tl: "Maligayang pagdating"
    },
    myTasks: {
      en: "My Tasks",
      es: "Mis Tareas",
      fr: "Mes Tâches",
      pt: "Minhas Tarefas",
      zh: "我的任务",
      vi: "Nhiệm vụ của tôi",
      ko: "내 작업",
      tl: "Aking mga Gawain"
    },
    todaysTasks: {
      en: "Today's Tasks",
      es: "Tareas de Hoy",
      fr: "Tâches du Jour",
      pt: "Tarefas de Hoje",
      zh: "今日任务",
      vi: "Nhiệm vụ hôm nay",
      ko: "오늘의 작업",
      tl: "Mga Gawain Ngayon"
    },
    completedTasks: {
      en: "Completed Tasks",
      es: "Tareas Completadas",
      fr: "Tâches Terminées",
      pt: "Tarefas Concluídas",
      zh: "已完成任务",
      vi: "Nhiệm vụ đã hoàn thành",
      ko: "완료된 작업",
      tl: "Mga Natapos na Gawain"
    },
    pendingTasks: {
      en: "Pending Tasks",
      es: "Tareas Pendientes",
      fr: "Tâches en Attente",
      pt: "Tarefas Pendentes",
      zh: "待处理任务",
      vi: "Nhiệm vụ đang chờ",
      ko: "대기 중인 작업",
      tl: "Mga Nakabinbing Gawain"
    },
    selectTasks: {
      en: "Select Tasks",
      es: "Seleccionar Tareas",
      fr: "Sélectionner les Tâches",
      pt: "Selecionar Tarefas",
      zh: "选择任务",
      vi: "Chọn nhiệm vụ",
      ko: "작업 선택",
      tl: "Pumili ng mga Gawain"
    },
    startShift: {
      en: "Start Shift",
      es: "Iniciar Turno",
      fr: "Commencer le Quart",
      pt: "Iniciar Turno",
      zh: "开始班次",
      vi: "Bắt đầu ca",
      ko: "교대 시작",
      tl: "Simulan ang Shift"
    },
    endShift: {
      en: "End Shift",
      es: "Terminar Turno",
      fr: "Terminer le Quart",
      pt: "Encerrar Turno",
      zh: "结束班次",
      vi: "Kết thúc ca",
      ko: "교대 종료",
      tl: "Tapusin ang Shift"
    },
    noTasksSelected: {
      en: "No tasks selected",
      es: "No hay tareas seleccionadas",
      fr: "Aucune tâche sélectionnée",
      pt: "Nenhuma tarefa selecionada",
      zh: "未选择任务",
      vi: "Chưa chọn nhiệm vụ",
      ko: "선택된 작업 없음",
      tl: "Walang napiling gawain"
    },
    noTasksAvailable: {
      en: "No tasks available",
      es: "No hay tareas disponibles",
      fr: "Aucune tâche disponible",
      pt: "Nenhuma tarefa disponível",
      zh: "没有可用任务",
      vi: "Không có nhiệm vụ",
      ko: "사용 가능한 작업 없음",
      tl: "Walang available na gawain"
    },
    feedback: {
      en: "Feedback",
      es: "Comentarios",
      fr: "Commentaires",
      pt: "Feedback",
      zh: "反馈",
      vi: "Phản hồi",
      ko: "피드백",
      tl: "Feedback"
    },
    performance: {
      en: "Performance",
      es: "Rendimiento",
      fr: "Performance",
      pt: "Desempenho",
      zh: "绩效",
      vi: "Hiệu suất",
      ko: "성과",
      tl: "Performance"
    },
    schedule: {
      en: "Schedule",
      es: "Horario",
      fr: "Horaire",
      pt: "Agenda",
      zh: "时间表",
      vi: "Lịch trình",
      ko: "일정",
      tl: "Iskedyul"
    },
    history: {
      en: "History",
      es: "Historial",
      fr: "Historique",
      pt: "Histórico",
      zh: "历史",
      vi: "Lịch sử",
      ko: "기록",
      tl: "Kasaysayan"
    },
    noOverdueTasks: {
      en: "No overdue tasks!",
      es: "¡No hay tareas atrasadas!",
      fr: "Aucune tâche en retard!",
      pt: "Nenhuma tarefa atrasada!",
      zh: "没有逾期任务！",
      vi: "Không có nhiệm vụ quá hạn!",
      ko: "기한 초과 작업 없음!",
      tl: "Walang overdue na gawain!"
    },
    upcomingCleanings: {
      en: "Upcoming scheduled cleanings",
      es: "Limpiezas programadas próximas",
      fr: "Nettoyages programmés à venir",
      pt: "Limpezas agendadas próximas",
      zh: "即将进行的清洁",
      vi: "Các lịch vệ sinh sắp tới",
      ko: "예정된 청소",
      tl: "Mga paparating na nakaplanong paglilinis"
    },
    noLineCleanings: {
      en: "No line cleanings scheduled today",
      es: "No hay limpiezas de línea programadas hoy",
      fr: "Aucun nettoyage de ligne prévu aujourd'hui",
      pt: "Nenhuma limpeza de linha agendada hoje",
      zh: "今天没有安排生产线清洁",
      vi: "Không có lịch vệ sinh dây chuyền hôm nay",
      ko: "오늘 예정된 라인 청소 없음",
      tl: "Walang nakaplanong paglilinis ng linya ngayon"
    },
    noCompletedTasks: {
      en: "No completed tasks yet",
      es: "Aún no hay tareas completadas",
      fr: "Aucune tâche terminée pour le moment",
      pt: "Nenhuma tarefa concluída ainda",
      zh: "暂无完成的任务",
      vi: "Chưa có nhiệm vụ hoàn thành",
      ko: "완료된 작업 없음",
      tl: "Wala pang natapos na gawain"
    },
    endMyDay: {
      en: "End My Day",
      es: "Terminar Mi Día",
      fr: "Terminer Ma Journée",
      pt: "Encerrar Meu Dia",
      zh: "结束我的一天",
      vi: "Kết thúc ngày của tôi",
      ko: "오늘 작업 종료",
      tl: "Tapusin ang Aking Araw"
    },
    givePeerFeedback: {
      en: "Give Peer Feedback",
      es: "Dar Retroalimentación a Compañero",
      fr: "Donner un Retour à un Collègue",
      pt: "Dar Feedback ao Colega",
      zh: "给同事反馈",
      vi: "Đưa phản hồi cho đồng nghiệp",
      ko: "동료 피드백 제공",
      tl: "Magbigay ng Feedback sa Kasamahan"
    },
    peerFeedback: {
      en: "Peer Feedback",
      es: "Retroalimentación de Compañeros",
      fr: "Retour des Collègues",
      pt: "Feedback de Colegas",
      zh: "同事反馈",
      vi: "Phản hồi đồng nghiệp",
      ko: "동료 피드백",
      tl: "Feedback ng Kasamahan"
    },
    anonymousFeedback: {
      en: "Anonymous Feedback",
      es: "Retroalimentación Anónima",
      fr: "Retour Anonyme",
      pt: "Feedback Anônimo",
      zh: "匿名反馈",
      vi: "Phản hồi ẩn danh",
      ko: "익명 피드백",
      tl: "Anonymous na Feedback"
    },
    recognitionFromTeammates: {
      en: "Recognition from Teammates",
      es: "Reconocimiento de Compañeros",
      fr: "Reconnaissance des Collègues",
      pt: "Reconhecimento de Colegas",
      zh: "同事的认可",
      vi: "Sự công nhận từ đồng nghiệp",
      ko: "동료로부터의 인정",
      tl: "Pagkilala mula sa mga Kasamahan"
    },
    announcements: {
      en: "Announcements",
      es: "Anuncios",
      fr: "Annonces",
      pt: "Anúncios",
      zh: "公告",
      vi: "Thông báo",
      ko: "공지사항",
      tl: "Mga Anunsyo"
    },
    noAnnouncements: {
      en: "No announcements",
      es: "Sin anuncios",
      fr: "Pas d'annonces",
      pt: "Sem anúncios",
      zh: "没有公告",
      vi: "Không có thông báo",
      ko: "공지사항 없음",
      tl: "Walang mga anunsyo"
    },
    newAnnouncement: {
      en: "New Announcement",
      es: "Nuevo Anuncio",
      fr: "Nouvelle Annonce",
      pt: "Novo Anúncio",
      zh: "新公告",
      vi: "Thông báo mới",
      ko: "새 공지사항",
      tl: "Bagong Anunsyo"
    },
    managerFeedback: {
      en: "Manager Feedback",
      es: "Retroalimentación del Gerente",
      fr: "Retour du Manager",
      pt: "Feedback do Gerente",
      zh: "经理反馈",
      vi: "Phản hồi của quản lý",
      ko: "관리자 피드백",
      tl: "Feedback ng Manager"
    },
    noFeedbackYet: {
      en: "No feedback yet",
      es: "Aún no hay retroalimentación",
      fr: "Pas encore de retour",
      pt: "Ainda sem feedback",
      zh: "暂无反馈",
      vi: "Chưa có phản hồi",
      ko: "아직 피드백 없음",
      tl: "Wala pang feedback"
    },
    managerCommentsWillAppear: {
      en: "Your manager's comments on completed tasks will appear here",
      es: "Los comentarios de tu gerente sobre las tareas completadas aparecerán aquí",
      fr: "Les commentaires de votre manager sur les tâches terminées apparaîtront ici",
      pt: "Os comentários do seu gerente sobre as tarefas concluídas aparecerão aqui",
      zh: "您的经理对已完成任务的评论将显示在这里",
      vi: "Nhận xét của quản lý về các nhiệm vụ đã hoàn thành sẽ xuất hiện ở đây",
      ko: "완료된 작업에 대한 관리자의 의견이 여기에 표시됩니다",
      tl: "Ang mga komento ng iyong manager sa mga natapos na gawain ay lalabas dito"
    },
    positive: {
      en: "Positive",
      es: "Positivo",
      fr: "Positif",
      pt: "Positivo",
      zh: "积极",
      vi: "Tích cực",
      ko: "긍정적",
      tl: "Positibo"
    },
    constructive: {
      en: "Constructive",
      es: "Constructivo",
      fr: "Constructif",
      pt: "Construtivo",
      zh: "建设性",
      vi: "Xây dựng",
      ko: "건설적",
      tl: "Nakabubuti"
    },
    note: {
      en: "Note",
      es: "Nota",
      fr: "Note",
      pt: "Nota",
      zh: "备注",
      vi: "Ghi chú",
      ko: "메모",
      tl: "Tala"
    },
    supervisor: {
      en: "Supervisor",
      es: "Supervisor",
      fr: "Superviseur",
      pt: "Supervisor",
      zh: "主管",
      vi: "Giám sát viên",
      ko: "감독관",
      tl: "Superbisor"
    }
  },

  // Task related
  tasks: {
    task: {
      en: "Task",
      es: "Tarea",
      fr: "Tâche",
      pt: "Tarefa",
      zh: "任务",
      vi: "Nhiệm vụ",
      ko: "작업",
      tl: "Gawain"
    },
    tasks: {
      en: "Tasks",
      es: "Tareas",
      fr: "Tâches",
      pt: "Tarefas",
      zh: "任务",
      vi: "Nhiệm vụ",
      ko: "작업",
      tl: "Mga Gawain"
    },
    startTask: {
      en: "Start Task",
      es: "Iniciar Tarea",
      fr: "Démarrer la Tâche",
      pt: "Iniciar Tarefa",
      zh: "开始任务",
      vi: "Bắt đầu nhiệm vụ",
      ko: "작업 시작",
      tl: "Simulan ang Gawain"
    },
    completeTask: {
      en: "Complete Task",
      es: "Completar Tarea",
      fr: "Terminer la Tâche",
      pt: "Concluir Tarefa",
      zh: "完成任务",
      vi: "Hoàn thành nhiệm vụ",
      ko: "작업 완료",
      tl: "Kumpletuhin ang Gawain"
    },
    markComplete: {
      en: "Mark as Complete",
      es: "Marcar como Completado",
      fr: "Marquer comme Terminé",
      pt: "Marcar como Concluído",
      zh: "标记为完成",
      vi: "Đánh dấu hoàn thành",
      ko: "완료로 표시",
      tl: "Markahan bilang Tapos"
    },
    viewInstructions: {
      en: "View Instructions",
      es: "Ver Instrucciones",
      fr: "Voir les Instructions",
      pt: "Ver Instruções",
      zh: "查看说明",
      vi: "Xem hướng dẫn",
      ko: "지침 보기",
      tl: "Tingnan ang mga Tagubilin"
    },
    viewSsop: {
      en: "View SSOP",
      es: "Ver SSOP",
      fr: "Voir SSOP",
      pt: "Ver SSOP",
      zh: "查看SSOP",
      vi: "Xem SSOP",
      ko: "SSOP 보기",
      tl: "Tingnan ang SSOP"
    },
    area: {
      en: "Area",
      es: "Área",
      fr: "Zone",
      pt: "Área",
      zh: "区域",
      vi: "Khu vực",
      ko: "구역",
      tl: "Lugar"
    },
    priority: {
      en: "Priority",
      es: "Prioridad",
      fr: "Priorité",
      pt: "Prioridade",
      zh: "优先级",
      vi: "Ưu tiên",
      ko: "우선순위",
      tl: "Priyoridad"
    },
    priorityLow: {
      en: "Low",
      es: "Baja",
      fr: "Faible",
      pt: "Baixa",
      zh: "低",
      vi: "Thấp",
      ko: "낮음",
      tl: "Mababa"
    },
    priorityMedium: {
      en: "Medium",
      es: "Media",
      fr: "Moyenne",
      pt: "Média",
      zh: "中",
      vi: "Trung bình",
      ko: "보통",
      tl: "Katamtaman"
    },
    priorityHigh: {
      en: "High",
      es: "Alta",
      fr: "Haute",
      pt: "Alta",
      zh: "高",
      vi: "Cao",
      ko: "높음",
      tl: "Mataas"
    },
    priorityCritical: {
      en: "Critical",
      es: "Crítica",
      fr: "Critique",
      pt: "Crítica",
      zh: "紧急",
      vi: "Quan trọng",
      ko: "긴급",
      tl: "Kritikal"
    },
    dueDate: {
      en: "Due Date",
      es: "Fecha de Vencimiento",
      fr: "Date d'Échéance",
      pt: "Data de Vencimento",
      zh: "截止日期",
      vi: "Ngày đến hạn",
      ko: "마감일",
      tl: "Petsa ng Deadline"
    },
    estimatedTime: {
      en: "Estimated Time",
      es: "Tiempo Estimado",
      fr: "Temps Estimé",
      pt: "Tempo Estimado",
      zh: "预计时间",
      vi: "Thời gian ước tính",
      ko: "예상 시간",
      tl: "Tinatayang Oras"
    },
    minutes: {
      en: "minutes",
      es: "minutos",
      fr: "minutes",
      pt: "minutos",
      zh: "分钟",
      vi: "phút",
      ko: "분",
      tl: "minuto"
    },
    hours: {
      en: "hours",
      es: "horas",
      fr: "heures",
      pt: "horas",
      zh: "小时",
      vi: "giờ",
      ko: "시간",
      tl: "oras"
    },
    frequency: {
      en: "Frequency",
      es: "Frecuencia",
      fr: "Fréquence",
      pt: "Frequência",
      zh: "频率",
      vi: "Tần suất",
      ko: "빈도",
      tl: "Dalas"
    },
    daily: {
      en: "Daily",
      es: "Diario",
      fr: "Quotidien",
      pt: "Diário",
      zh: "每日",
      vi: "Hàng ngày",
      ko: "매일",
      tl: "Araw-araw"
    },
    weekly: {
      en: "Weekly",
      es: "Semanal",
      fr: "Hebdomadaire",
      pt: "Semanal",
      zh: "每周",
      vi: "Hàng tuần",
      ko: "매주",
      tl: "Lingguhan"
    },
    monthly: {
      en: "Monthly",
      es: "Mensual",
      fr: "Mensuel",
      pt: "Mensal",
      zh: "每月",
      vi: "Hàng tháng",
      ko: "매월",
      tl: "Buwanan"
    },
    addNotes: {
      en: "Add Notes",
      es: "Agregar Notas",
      fr: "Ajouter des Notes",
      pt: "Adicionar Notas",
      zh: "添加备注",
      vi: "Thêm ghi chú",
      ko: "메모 추가",
      tl: "Magdagdag ng mga Tala"
    },
    notesPlaceholder: {
      en: "Enter any notes about this task...",
      es: "Ingrese notas sobre esta tarea...",
      fr: "Entrez des notes sur cette tâche...",
      pt: "Digite notas sobre esta tarefa...",
      zh: "输入关于此任务的备注...",
      vi: "Nhập ghi chú về nhiệm vụ này...",
      ko: "이 작업에 대한 메모를 입력하세요...",
      tl: "Ilagay ang mga tala tungkol sa gawaing ito..."
    },
    selectTasksForToday: {
      en: "Select Your Tasks for Today",
      es: "Seleccione sus Tareas para Hoy",
      fr: "Sélectionnez vos Tâches pour Aujourd'hui",
      pt: "Selecione suas Tarefas para Hoje",
      zh: "选择今天的任务",
      vi: "Chọn Nhiệm vụ cho Hôm nay",
      ko: "오늘의 작업 선택",
      tl: "Piliin ang iyong mga Gawain para Ngayon"
    },
    selectTasksDescription: {
      en: "Choose tasks to meet your daily quotas, or skip if you're an extra today",
      es: "Elija tareas para cumplir sus cuotas diarias, u omita si es un extra hoy",
      fr: "Choisissez des tâches pour atteindre vos quotas quotidiens, ou passez si vous êtes en extra aujourd'hui",
      pt: "Escolha tarefas para cumprir suas cotas diárias, ou pule se você for um extra hoje",
      zh: "选择任务以达成每日配额，如果今天是额外人员可跳过",
      vi: "Chọn nhiệm vụ để đạt hạn ngạch hàng ngày, hoặc bỏ qua nếu bạn là người phụ hôm nay",
      ko: "일일 할당량을 충족할 작업을 선택하거나, 추가 인원인 경우 건너뛰세요",
      tl: "Pumili ng mga gawain para matupad ang iyong mga pang-araw-araw na quota, o laktawan kung ikaw ay extra ngayon"
    },
    rainDiverterInspection: {
      en: "Rain Diverter Inspection",
      es: "Inspección de Desviador de Lluvia",
      fr: "Inspection du Déflecteur de Pluie",
      pt: "Inspeção do Desviador de Chuva",
      zh: "雨水分流器检查",
      vi: "Kiểm tra Bộ chuyển hướng mưa",
      ko: "빗물 전환기 점검",
      tl: "Inspeksyon ng Rain Diverter"
    },
    alreadyDoneThisPeriod: {
      en: "Already done this period",
      es: "Ya completado este período",
      fr: "Déjà fait cette période",
      pt: "Já feito neste período",
      zh: "本周期已完成",
      vi: "Đã hoàn thành trong kỳ này",
      ko: "이번 기간에 이미 완료됨",
      tl: "Natapos na sa panahong ito"
    },
    dailyTaskGroups: {
      en: "Daily Task Groups",
      es: "Grupos de Tareas Diarias",
      fr: "Groupes de Tâches Quotidiennes",
      pt: "Grupos de Tarefas Diárias",
      zh: "每日任务组",
      vi: "Nhóm Nhiệm vụ Hàng ngày",
      ko: "일일 작업 그룹",
      tl: "Mga Grupo ng Pang-araw-araw na Gawain"
    },
    alreadyClaimedToday: {
      en: "Already claimed today",
      es: "Ya reclamado hoy",
      fr: "Déjà pris aujourd'hui",
      pt: "Já reivindicado hoje",
      zh: "今天已被认领",
      vi: "Đã được nhận hôm nay",
      ko: "오늘 이미 선택됨",
      tl: "Nakuha na ngayon"
    },
    noTasksAvailable: {
      en: "No tasks available to select at this time. You may proceed without selecting tasks.",
      es: "No hay tareas disponibles para seleccionar en este momento. Puede continuar sin seleccionar tareas.",
      fr: "Aucune tâche disponible à sélectionner pour le moment. Vous pouvez continuer sans sélectionner de tâches.",
      pt: "Nenhuma tarefa disponível para selecionar no momento. Você pode continuar sem selecionar tarefas.",
      zh: "目前没有可选任务。您可以继续而不选择任务。",
      vi: "Không có nhiệm vụ nào để chọn lúc này. Bạn có thể tiếp tục mà không chọn nhiệm vụ.",
      ko: "현재 선택할 수 있는 작업이 없습니다. 작업을 선택하지 않고 진행할 수 있습니다.",
      tl: "Walang available na gawain para piliin sa ngayon. Maaari kang magpatuloy nang hindi pumipili ng mga gawain."
    },
    noNonDailyTasks: {
      en: "No non-daily tasks available. Select a task group above if needed.",
      es: "No hay tareas no diarias disponibles. Seleccione un grupo de tareas arriba si es necesario.",
      fr: "Aucune tâche non quotidienne disponible. Sélectionnez un groupe de tâches ci-dessus si nécessaire.",
      pt: "Nenhuma tarefa não diária disponível. Selecione um grupo de tarefas acima, se necessário.",
      zh: "没有非每日任务可用。如需要，请在上方选择任务组。",
      vi: "Không có nhiệm vụ không hàng ngày. Chọn một nhóm nhiệm vụ ở trên nếu cần.",
      ko: "비일일 작업이 없습니다. 필요한 경우 위의 작업 그룹을 선택하세요.",
      tl: "Walang available na hindi pang-araw-araw na gawain. Pumili ng grupo ng gawain sa itaas kung kinakailangan."
    },
    readyToProceed: {
      en: "Ready to proceed!",
      es: "¡Listo para continuar!",
      fr: "Prêt à continuer!",
      pt: "Pronto para continuar!",
      zh: "准备继续！",
      vi: "Sẵn sàng tiếp tục!",
      ko: "진행 준비 완료!",
      tl: "Handa nang magpatuloy!"
    },
    notEnoughTasksForQuotas: {
      en: "Not enough tasks available to meet quotas",
      es: "No hay suficientes tareas disponibles para cumplir las cuotas",
      fr: "Pas assez de tâches disponibles pour atteindre les quotas",
      pt: "Não há tarefas suficientes disponíveis para cumprir as cotas",
      zh: "可用任务不足以达到配额",
      vi: "Không đủ nhiệm vụ để đạt hạn ngạch",
      ko: "할당량을 충족할 충분한 작업이 없습니다",
      tl: "Hindi sapat ang mga gawain para matupad ang mga quota"
    },
    selectMoreTasks: {
      en: "Select more tasks to meet quotas",
      es: "Seleccione más tareas para cumplir las cuotas",
      fr: "Sélectionnez plus de tâches pour atteindre les quotas",
      pt: "Selecione mais tarefas para cumprir as cotas",
      zh: "选择更多任务以达到配额",
      vi: "Chọn thêm nhiệm vụ để đạt hạn ngạch",
      ko: "할당량을 충족하려면 더 많은 작업을 선택하세요",
      tl: "Pumili ng higit pang mga gawain para matupad ang mga quota"
    },
    imAnExtraToday: {
      en: "I'm an Extra Today",
      es: "Soy un Extra Hoy",
      fr: "Je suis un Extra Aujourd'hui",
      pt: "Sou um Extra Hoje",
      zh: "我今天是额外人员",
      vi: "Tôi là người phụ hôm nay",
      ko: "오늘 추가 인원입니다",
      tl: "Ako ay Extra Ngayon"
    },
    taskRecommendations: {
      en: "Task Recommendations",
      es: "Recomendaciones de Tareas",
      fr: "Recommandations de Tâches",
      pt: "Recomendações de Tarefas",
      zh: "任务推荐",
      vi: "Đề xuất nhiệm vụ",
      ko: "작업 추천",
      tl: "Mga Rekomendasyon ng Gawain"
    },
    personalizedForDevelopment: {
      en: "Personalized for your development",
      es: "Personalizado para tu desarrollo",
      fr: "Personnalisé pour votre développement",
      pt: "Personalizado para seu desenvolvimento",
      zh: "为您的发展量身定制",
      vi: "Được cá nhân hóa cho sự phát triển của bạn",
      ko: "당신의 성장을 위해 맞춤 설정됨",
      tl: "Naka-personalize para sa iyong pag-unlad"
    },
    backlog: {
      en: "Backlog",
      es: "Pendientes",
      fr: "En attente",
      pt: "Pendências",
      zh: "待办",
      vi: "Tồn đọng",
      ko: "백로그",
      tl: "Backlog"
    },
    add: {
      en: "Add",
      es: "Agregar",
      fr: "Ajouter",
      pt: "Adicionar",
      zh: "添加",
      vi: "Thêm",
      ko: "추가",
      tl: "Idagdag"
    },
    subtask: {
      en: "subtask",
      es: "subtarea",
      fr: "sous-tâche",
      pt: "subtarefa",
      zh: "子任务",
      vi: "nhiệm vụ con",
      ko: "하위 작업",
      tl: "subtask"
    },
    subtasks: {
      en: "subtasks",
      es: "subtareas",
      fr: "sous-tâches",
      pt: "subtarefas",
      zh: "子任务",
      vi: "nhiệm vụ con",
      ko: "하위 작업",
      tl: "mga subtask"
    },
    assigned: {
      en: "assigned",
      es: "asignadas",
      fr: "assignées",
      pt: "atribuídas",
      zh: "已分配",
      vi: "được giao",
      ko: "할당됨",
      tl: "nakatalaga"
    },
    markAsCompleted: {
      en: "Mark",
      es: "Marcar",
      fr: "Marquer",
      pt: "Marcar",
      zh: "标记",
      vi: "Đánh dấu",
      ko: "표시",
      tl: "Markahan"
    },
    asCompleted: {
      en: "as completed",
      es: "como completada",
      fr: "comme terminée",
      pt: "como concluída",
      zh: "为已完成",
      vi: "là đã hoàn thành",
      ko: "완료됨으로",
      tl: "bilang tapos"
    },
    completionNotes: {
      en: "Completion Notes",
      es: "Notas de Finalización",
      fr: "Notes de Complétion",
      pt: "Notas de Conclusão",
      zh: "完成备注",
      vi: "Ghi chú hoàn thành",
      ko: "완료 메모",
      tl: "Mga Tala ng Pagkumpleto"
    },
    digitalSignature: {
      en: "Digital Signature",
      es: "Firma Digital",
      fr: "Signature Numérique",
      pt: "Assinatura Digital",
      zh: "数字签名",
      vi: "Chữ ký điện tử",
      ko: "디지털 서명",
      tl: "Digital na Lagda"
    },
    signToConfirm: {
      en: "Please sign above to confirm task completion",
      es: "Por favor firme arriba para confirmar la finalización de la tarea",
      fr: "Veuillez signer ci-dessus pour confirmer l'achèvement de la tâche",
      pt: "Por favor assine acima para confirmar a conclusão da tarefa",
      zh: "请在上方签名以确认任务完成",
      vi: "Vui lòng ký ở trên để xác nhận hoàn thành nhiệm vụ",
      ko: "작업 완료를 확인하려면 위에 서명하세요",
      tl: "Mangyaring pumirma sa itaas para kumpirmahin ang pagkumpleto ng gawain"
    },
    markComplete: {
      en: "Mark Complete",
      es: "Marcar Completo",
      fr: "Marquer Terminé",
      pt: "Marcar Concluído",
      zh: "标记完成",
      vi: "Đánh dấu hoàn thành",
      ko: "완료 표시",
      tl: "Markahan bilang Tapos"
    },
    viewSSOPDocument: {
      en: "View SSOP Document",
      es: "Ver Documento SSOP",
      fr: "Voir le Document SSOP",
      pt: "Ver Documento SSOP",
      zh: "查看SSOP文档",
      vi: "Xem Tài liệu SSOP",
      ko: "SSOP 문서 보기",
      tl: "Tingnan ang SSOP Document"
    },
    photoEvidenceRequired: {
      en: "Photo Evidence Required",
      es: "Evidencia Fotográfica Requerida",
      fr: "Preuve Photographique Requise",
      pt: "Evidência Fotográfica Necessária",
      zh: "需要照片证据",
      vi: "Yêu cầu bằng chứng ảnh",
      ko: "사진 증거 필요",
      tl: "Kinakailangang Ebidensya ng Larawan"
    },
    beforePhoto: {
      en: "Before Photo",
      es: "Foto Antes",
      fr: "Photo Avant",
      pt: "Foto Antes",
      zh: "之前照片",
      vi: "Ảnh trước",
      ko: "이전 사진",
      tl: "Larawan Bago"
    },
    afterPhoto: {
      en: "After Photo",
      es: "Foto Después",
      fr: "Photo Après",
      pt: "Foto Depois",
      zh: "之后照片",
      vi: "Ảnh sau",
      ko: "이후 사진",
      tl: "Larawan Pagkatapos"
    },
    takeBefore: {
      en: "Take Before",
      es: "Tomar Antes",
      fr: "Prendre Avant",
      pt: "Tirar Antes",
      zh: "拍摄之前",
      vi: "Chụp trước",
      ko: "이전 촬영",
      tl: "Kunan Bago"
    },
    takeAfter: {
      en: "Take After",
      es: "Tomar Después",
      fr: "Prendre Après",
      pt: "Tirar Depois",
      zh: "拍摄之后",
      vi: "Chụp sau",
      ko: "이후 촬영",
      tl: "Kunan Pagkatapos"
    }
  },

  // Signature related
  signature: {
    signature: {
      en: "Signature",
      es: "Firma",
      fr: "Signature",
      pt: "Assinatura",
      zh: "签名",
      vi: "Chữ ký",
      ko: "서명",
      tl: "Lagda"
    },
    signHere: {
      en: "Sign Here",
      es: "Firme Aquí",
      fr: "Signez Ici",
      pt: "Assine Aqui",
      zh: "在此签名",
      vi: "Ký tại đây",
      ko: "여기에 서명",
      tl: "Pumirma Dito"
    },
    clearSignature: {
      en: "Clear",
      es: "Borrar",
      fr: "Effacer",
      pt: "Limpar",
      zh: "清除",
      vi: "Xóa",
      ko: "지우기",
      tl: "Burahin"
    },
    signatureRequired: {
      en: "Signature is required",
      es: "Se requiere firma",
      fr: "La signature est requise",
      pt: "Assinatura é obrigatória",
      zh: "需要签名",
      vi: "Yêu cầu chữ ký",
      ko: "서명이 필요합니다",
      tl: "Kinakailangan ang lagda"
    }
  },

  // Training related
  training: {
    training: {
      en: "Training",
      es: "Capacitación",
      fr: "Formation",
      pt: "Treinamento",
      zh: "培训",
      vi: "Đào tạo",
      ko: "교육",
      tl: "Pagsasanay"
    },
    trainingRequired: {
      en: "Training Required",
      es: "Capacitación Requerida",
      fr: "Formation Requise",
      pt: "Treinamento Necessário",
      zh: "需要培训",
      vi: "Yêu cầu đào tạo",
      ko: "교육 필요",
      tl: "Kinakailangang Pagsasanay"
    },
    viewTraining: {
      en: "View Training",
      es: "Ver Capacitación",
      fr: "Voir la Formation",
      pt: "Ver Treinamento",
      zh: "查看培训",
      vi: "Xem đào tạo",
      ko: "교육 보기",
      tl: "Tingnan ang Pagsasanay"
    },
    completeTraining: {
      en: "Complete Training",
      es: "Completar Capacitación",
      fr: "Terminer la Formation",
      pt: "Concluir Treinamento",
      zh: "完成培训",
      vi: "Hoàn thành đào tạo",
      ko: "교육 완료",
      tl: "Kumpletuhin ang Pagsasanay"
    },
    quiz: {
      en: "Quiz",
      es: "Cuestionario",
      fr: "Quiz",
      pt: "Questionário",
      zh: "测验",
      vi: "Bài kiểm tra",
      ko: "퀴즈",
      tl: "Pagsusulit"
    },
    takeQuiz: {
      en: "Take Quiz",
      es: "Tomar Cuestionario",
      fr: "Passer le Quiz",
      pt: "Fazer Questionário",
      zh: "参加测验",
      vi: "Làm bài kiểm tra",
      ko: "퀴즈 풀기",
      tl: "Kumuha ng Pagsusulit"
    },
    quizPassed: {
      en: "Quiz Passed",
      es: "Cuestionario Aprobado",
      fr: "Quiz Réussi",
      pt: "Questionário Aprovado",
      zh: "测验通过",
      vi: "Đã qua bài kiểm tra",
      ko: "퀴즈 통과",
      tl: "Naipasa ang Pagsusulit"
    },
    quizFailed: {
      en: "Quiz Failed",
      es: "Cuestionario Reprobado",
      fr: "Quiz Échoué",
      pt: "Questionário Reprovado",
      zh: "测验未通过",
      vi: "Không qua bài kiểm tra",
      ko: "퀴즈 불합격",
      tl: "Hindi Naipasa ang Pagsusulit"
    },
    needsTraining: {
      en: "Needs Training",
      es: "Requiere Capacitación",
      fr: "Formation Nécessaire",
      pt: "Precisa de Treinamento",
      zh: "需要培训",
      vi: "Cần đào tạo",
      ko: "교육 필요",
      tl: "Kailangan ng Pagsasanay"
    },
    train: {
      en: "Train",
      es: "Capacitar",
      fr: "Former",
      pt: "Treinar",
      zh: "培训",
      vi: "Đào tạo",
      ko: "교육",
      tl: "Magsanay"
    },
    completeBeforeStarting: {
      en: "Complete",
      es: "Complete",
      fr: "Terminez",
      pt: "Complete",
      zh: "完成",
      vi: "Hoàn thành",
      ko: "완료",
      tl: "Kumpletuhin"
    },
    beforeStartingTask: {
      en: "before starting this task",
      es: "antes de comenzar esta tarea",
      fr: "avant de commencer cette tâche",
      pt: "antes de iniciar esta tarefa",
      zh: "然后再开始此任务",
      vi: "trước khi bắt đầu nhiệm vụ này",
      ko: "이 작업을 시작하기 전에",
      tl: "bago simulan ang gawaing ito"
    },
    quizNotPassed: {
      en: "Quiz Not Passed",
      es: "Cuestionario No Aprobado",
      fr: "Quiz Non Réussi",
      pt: "Questionário Não Aprovado",
      zh: "测验未通过",
      vi: "Chưa qua bài kiểm tra",
      ko: "퀴즈 미통과",
      tl: "Hindi Naipasa ang Pagsusulit"
    },
    trainingProgress: {
      en: "Training Progress",
      es: "Progreso de Capacitación",
      fr: "Progrès de la Formation",
      pt: "Progresso do Treinamento",
      zh: "培训进度",
      vi: "Tiến độ đào tạo",
      ko: "교육 진행 상황",
      tl: "Progreso ng Pagsasanay"
    },
    searchTraining: {
      en: "Search training materials...",
      es: "Buscar materiales de capacitación...",
      fr: "Rechercher les supports de formation...",
      pt: "Pesquisar materiais de treinamento...",
      zh: "搜索培训资料...",
      vi: "Tìm kiếm tài liệu đào tạo...",
      ko: "교육 자료 검색...",
      tl: "Maghanap ng mga materyal sa pagsasanay..."
    },
    noTrainingMaterials: {
      en: "No training materials available",
      es: "No hay materiales de capacitación disponibles",
      fr: "Aucun support de formation disponible",
      pt: "Nenhum material de treinamento disponível",
      zh: "没有可用的培训资料",
      vi: "Không có tài liệu đào tạo",
      ko: "사용 가능한 교육 자료 없음",
      tl: "Walang available na materyal sa pagsasanay"
    },
    trainingComplete: {
      en: "Great job! Training complete",
      es: "¡Buen trabajo! Capacitación completada",
      fr: "Bon travail! Formation terminée",
      pt: "Bom trabalho! Treinamento concluído",
      zh: "做得好！培训完成",
      vi: "Làm tốt lắm! Đào tạo hoàn thành",
      ko: "잘했어요! 교육 완료",
      tl: "Magaling! Tapos na ang pagsasanay"
    },
    performanceEvaluation: {
      en: "Performance Evaluation",
      es: "Evaluación de Desempeño",
      fr: "Évaluation de Performance",
      pt: "Avaliação de Desempenho",
      zh: "绩效评估",
      vi: "Đánh giá hiệu suất",
      ko: "성과 평가",
      tl: "Pagsusuri ng Pagganap"
    },
    requestEvaluation: {
      en: "Request Evaluation",
      es: "Solicitar Evaluación",
      fr: "Demander une Évaluation",
      pt: "Solicitar Avaliação",
      zh: "请求评估",
      vi: "Yêu cầu đánh giá",
      ko: "평가 요청",
      tl: "Humiling ng Pagsusuri"
    },
    awaitingEvaluator: {
      en: "A qualified evaluator must observe you performing this task",
      es: "Un evaluador calificado debe observarlo realizando esta tarea",
      fr: "Un évaluateur qualifié doit vous observer effectuer cette tâche",
      pt: "Um avaliador qualificado deve observá-lo realizando esta tarefa",
      zh: "合格的评估员必须观察您执行此任务",
      vi: "Một người đánh giá đủ điều kiện phải quan sát bạn thực hiện nhiệm vụ này",
      ko: "자격을 갖춘 평가자가 이 작업을 수행하는 것을 관찰해야 합니다",
      tl: "Dapat obserbahan ka ng isang kwalipikadong evaluator habang ginagawa mo ang gawaing ito"
    },
    fullyQualified: {
      en: "Fully qualified to perform this task independently",
      es: "Totalmente calificado para realizar esta tarea de forma independiente",
      fr: "Pleinement qualifié pour effectuer cette tâche de manière indépendante",
      pt: "Totalmente qualificado para realizar esta tarefa de forma independente",
      zh: "完全有资格独立执行此任务",
      vi: "Đủ điều kiện để thực hiện nhiệm vụ này một cách độc lập",
      ko: "이 작업을 독립적으로 수행할 수 있는 자격을 갖춤",
      tl: "Ganap na kwalipikado para gawin ang gawaing ito nang nakapag-iisa"
    },
    submitAnswers: {
      en: "Submit Answers",
      es: "Enviar Respuestas",
      fr: "Soumettre les Réponses",
      pt: "Enviar Respostas",
      zh: "提交答案",
      vi: "Gửi câu trả lời",
      ko: "답변 제출",
      tl: "Isumite ang mga Sagot"
    },
    answerAllQuestions: {
      en: "Please answer all questions before submitting",
      es: "Por favor responda todas las preguntas antes de enviar",
      fr: "Veuillez répondre à toutes les questions avant de soumettre",
      pt: "Por favor responda todas as perguntas antes de enviar",
      zh: "请在提交前回答所有问题",
      vi: "Vui lòng trả lời tất cả câu hỏi trước khi gửi",
      ko: "제출하기 전에 모든 질문에 답해 주세요",
      tl: "Mangyaring sagutin ang lahat ng tanong bago isumite"
    },
    youGot: {
      en: "You got",
      es: "Obtuviste",
      fr: "Vous avez obtenu",
      pt: "Você acertou",
      zh: "你答对了",
      vi: "Bạn đạt được",
      ko: "획득 점수",
      tl: "Nakuha mo"
    },
    correct: {
      en: "correct",
      es: "correctas",
      fr: "correct",
      pt: "corretas",
      zh: "正确",
      vi: "đúng",
      ko: "정답",
      tl: "tama"
    },
    need80ToPass: {
      en: "You need 80% to pass. Please review and try again.",
      es: "Necesitas 80% para aprobar. Por favor revisa e intenta de nuevo.",
      fr: "Vous avez besoin de 80% pour réussir. Veuillez revoir et réessayer.",
      pt: "Você precisa de 80% para passar. Por favor revise e tente novamente.",
      zh: "需要80%才能通过。请复习后重试。",
      vi: "Bạn cần 80% để đạt. Vui lòng xem lại và thử lại.",
      ko: "합격하려면 80%가 필요합니다. 검토 후 다시 시도해 주세요.",
      tl: "Kailangan mo ng 80% para makapasa. Mangyaring suriin at subukan muli."
    },
    openInNewTab: {
      en: "Open in New Tab",
      es: "Abrir en Nueva Pestaña",
      fr: "Ouvrir dans un Nouvel Onglet",
      pt: "Abrir em Nova Aba",
      zh: "在新标签页中打开",
      vi: "Mở trong tab mới",
      ko: "새 탭에서 열기",
      tl: "Buksan sa Bagong Tab"
    },
    haveReadMaterial: {
      en: "I have read and reviewed this training material",
      es: "He leído y revisado este material de capacitación",
      fr: "J'ai lu et examiné ce matériel de formation",
      pt: "Eu li e revisei este material de treinamento",
      zh: "我已阅读并审查了此培训材料",
      vi: "Tôi đã đọc và xem xét tài liệu đào tạo này",
      ko: "이 교육 자료를 읽고 검토했습니다",
      tl: "Nabasa at nasuri ko na ang materyal na ito sa pagsasanay"
    },
    takeQuizToComplete: {
      en: "Take Quiz to Complete",
      es: "Realizar Cuestionario para Completar",
      fr: "Passer le Quiz pour Terminer",
      pt: "Fazer Questionário para Concluir",
      zh: "完成测验以完成",
      vi: "Làm bài kiểm tra để hoàn thành",
      ko: "퀴즈 풀어서 완료하기",
      tl: "Kumuha ng Pagsusulit para Kumpleto"
    },
    questions: {
      en: "questions",
      es: "preguntas",
      fr: "questions",
      pt: "perguntas",
      zh: "问题",
      vi: "câu hỏi",
      ko: "질문",
      tl: "mga tanong"
    },
    mustPassQuiz: {
      en: "You must pass the quiz to complete this training",
      es: "Debe aprobar el cuestionario para completar esta capacitación",
      fr: "Vous devez réussir le quiz pour terminer cette formation",
      pt: "Você deve passar no questionário para concluir este treinamento",
      zh: "您必须通过测验才能完成此培训",
      vi: "Bạn phải đạt bài kiểm tra để hoàn thành đào tạo này",
      ko: "이 교육을 완료하려면 퀴즈를 통과해야 합니다",
      tl: "Kailangan mong maipasa ang pagsusulit para makumpleto ang pagsasanay na ito"
    },
    markAsComplete: {
      en: "Mark as Complete",
      es: "Marcar como Completado",
      fr: "Marquer comme Terminé",
      pt: "Marcar como Concluído",
      zh: "标记为完成",
      vi: "Đánh dấu hoàn thành",
      ko: "완료로 표시",
      tl: "Markahan bilang Kumpleto"
    },
    noQuizRequired: {
      en: "No quiz required for this training",
      es: "No se requiere cuestionario para esta capacitación",
      fr: "Aucun quiz requis pour cette formation",
      pt: "Nenhum questionário necessário para este treinamento",
      zh: "此培训不需要测验",
      vi: "Không yêu cầu bài kiểm tra cho đào tạo này",
      ko: "이 교육에는 퀴즈가 필요하지 않습니다",
      tl: "Walang kinakailangang pagsusulit para sa pagsasanay na ito"
    },
    answerAllToComplete: {
      en: "Answer all questions correctly to complete training",
      es: "Responda todas las preguntas correctamente para completar la capacitación",
      fr: "Répondez correctement à toutes les questions pour terminer la formation",
      pt: "Responda todas as perguntas corretamente para concluir o treinamento",
      zh: "正确回答所有问题以完成培训",
      vi: "Trả lời đúng tất cả câu hỏi để hoàn thành đào tạo",
      ko: "교육을 완료하려면 모든 질문에 올바르게 답하세요",
      tl: "Sagutin nang tama ang lahat ng tanong para makumpleto ang pagsasanay"
    }
  },

  // Cleaning/Inspection related
  cleaning: {
    cleaning: {
      en: "Cleaning",
      es: "Limpieza",
      fr: "Nettoyage",
      pt: "Limpeza",
      zh: "清洁",
      vi: "Vệ sinh",
      ko: "청소",
      tl: "Paglilinis"
    },
    lineCleaning: {
      en: "Line Cleaning",
      es: "Limpieza de Línea",
      fr: "Nettoyage de Ligne",
      pt: "Limpeza de Linha",
      zh: "生产线清洁",
      vi: "Vệ sinh dây chuyền",
      ko: "라인 청소",
      tl: "Paglilinis ng Linya"
    },
    drainCleaning: {
      en: "Drain Cleaning",
      es: "Limpieza de Desagüe",
      fr: "Nettoyage des Drains",
      pt: "Limpeza de Ralo",
      zh: "排水口清洁",
      vi: "Vệ sinh cống",
      ko: "배수구 청소",
      tl: "Paglilinis ng Drain"
    },
    drains: {
      en: "Drains",
      es: "Desagües",
      fr: "Drains",
      pt: "Ralos",
      zh: "排水口",
      vi: "Cống",
      ko: "배수구",
      tl: "Mga Drain"
    },
    dailyTask: {
      en: "Daily Task",
      es: "Tarea Diaria",
      fr: "Tâche Quotidienne",
      pt: "Tarefa Diária",
      zh: "每日任务",
      vi: "Nhiệm vụ hàng ngày",
      ko: "일일 작업",
      tl: "Pang-araw-araw na Gawain"
    },
    weeklyTask: {
      en: "Weekly Task",
      es: "Tarea Semanal",
      fr: "Tâche Hebdomadaire",
      pt: "Tarefa Semanal",
      zh: "每周任务",
      vi: "Nhiệm vụ hàng tuần",
      ko: "주간 작업",
      tl: "Lingguhang Gawain"
    },
    weekly: {
      en: "Weekly",
      es: "Semanal",
      fr: "Hebdomadaire",
      pt: "Semanal",
      zh: "每周",
      vi: "Hàng tuần",
      ko: "주간",
      tl: "Lingguhan"
    },
    daily: {
      en: "Daily",
      es: "Diario",
      fr: "Quotidien",
      pt: "Diário",
      zh: "每日",
      vi: "Hàng ngày",
      ko: "매일",
      tl: "Araw-araw"
    },
    monthly: {
      en: "Monthly",
      es: "Mensual",
      fr: "Mensuel",
      pt: "Mensal",
      zh: "每月",
      vi: "Hàng tháng",
      ko: "월간",
      tl: "Buwanan"
    },
    biweekly: {
      en: "Bi-Weekly",
      es: "Quincenal",
      fr: "Bi-Hebdomadaire",
      pt: "Quinzenal",
      zh: "每两周",
      vi: "Hai tuần một lần",
      ko: "격주",
      tl: "Dalawang Linggo"
    },
    bimonthly: {
      en: "Bi-Monthly",
      es: "Bimensual",
      fr: "Bimensuel",
      pt: "Bimensal",
      zh: "双月",
      vi: "Hai tháng một lần",
      ko: "격월",
      tl: "Dalawang Buwan"
    },
    inspection: {
      en: "Inspection",
      es: "Inspección",
      fr: "Inspection",
      pt: "Inspeção",
      zh: "检查",
      vi: "Kiểm tra",
      ko: "검사",
      tl: "Inspeksyon"
    },
    preOpInspection: {
      en: "Pre-Op Inspection",
      es: "Inspección Pre-Operativa",
      fr: "Inspection Pré-Opératoire",
      pt: "Inspeção Pré-Operacional",
      zh: "操作前检查",
      vi: "Kiểm tra trước vận hành",
      ko: "작업 전 검사",
      tl: "Pre-Op na Inspeksyon"
    },
    postCleanInspection: {
      en: "Post-Clean Inspection",
      es: "Inspección Post-Limpieza",
      fr: "Inspection Post-Nettoyage",
      pt: "Inspeção Pós-Limpeza",
      zh: "清洁后检查",
      vi: "Kiểm tra sau vệ sinh",
      ko: "청소 후 검사",
      tl: "Post-Clean na Inspeksyon"
    },
    passed: {
      en: "Passed",
      es: "Aprobado",
      fr: "Réussi",
      pt: "Aprovado",
      zh: "通过",
      vi: "Đạt",
      ko: "합격",
      tl: "Pumasa"
    },
    failed: {
      en: "Failed",
      es: "Reprobado",
      fr: "Échoué",
      pt: "Reprovado",
      zh: "未通过",
      vi: "Không đạt",
      ko: "불합격",
      tl: "Hindi Pumasa"
    },
    pending: {
      en: "Pending",
      es: "Pendiente",
      fr: "En Attente",
      pt: "Pendente",
      zh: "待定",
      vi: "Đang chờ",
      ko: "대기 중",
      tl: "Nakabinbin"
    },
    startInspection: {
      en: "Start Inspection",
      es: "Iniciar Inspección",
      fr: "Démarrer l'Inspection",
      pt: "Iniciar Inspeção",
      zh: "开始检查",
      vi: "Bắt đầu kiểm tra",
      ko: "검사 시작",
      tl: "Simulan ang Inspeksyon"
    },
    lineCleaningAssignments: {
      en: "Line Cleaning Assignments",
      es: "Asignaciones de Limpieza de Línea",
      fr: "Affectations de Nettoyage de Ligne",
      pt: "Atribuições de Limpeza de Linha",
      zh: "生产线清洁任务",
      vi: "Phân công vệ sinh dây chuyền",
      ko: "라인 청소 배정",
      tl: "Mga Takdang Paglilinis ng Linya"
    },
    lineCleanings: {
      en: "Line cleanings",
      es: "Limpiezas de línea",
      fr: "Nettoyages de ligne",
      pt: "Limpezas de linha",
      zh: "生产线清洁",
      vi: "Vệ sinh dây chuyền",
      ko: "라인 청소",
      tl: "Paglilinis ng linya"
    }
  },

  // ATP Testing
  atp: {
    atpCompliance: {
      en: "ATP Compliance",
      es: "Cumplimiento ATP",
      fr: "Conformité ATP",
      pt: "Conformidade ATP",
      zh: "ATP合规",
      vi: "Tuân thủ ATP",
      ko: "ATP 준수",
      tl: "ATP Compliance"
    },
    atpTest: {
      en: "ATP Test",
      es: "Prueba ATP",
      fr: "Test ATP",
      pt: "Teste ATP",
      zh: "ATP测试",
      vi: "Thử nghiệm ATP",
      ko: "ATP 테스트",
      tl: "ATP Test"
    },
    atpRequired: {
      en: "ATP Test Required",
      es: "Prueba ATP Requerida",
      fr: "Test ATP Requis",
      pt: "Teste ATP Necessário",
      zh: "需要ATP测试",
      vi: "Yêu cầu thử nghiệm ATP",
      ko: "ATP 테스트 필요",
      tl: "Kinakailangang ATP Test"
    },
    enterRluValue: {
      en: "Enter RLU Value",
      es: "Ingrese Valor RLU",
      fr: "Entrez la Valeur RLU",
      pt: "Digite o Valor RLU",
      zh: "输入RLU值",
      vi: "Nhập giá trị RLU",
      ko: "RLU 값 입력",
      tl: "Ilagay ang RLU Value"
    },
    pass: {
      en: "Pass",
      es: "Aprobado",
      fr: "Réussi",
      pt: "Aprovado",
      zh: "通过",
      vi: "Đạt",
      ko: "합격",
      tl: "Pumasa"
    },
    fail: {
      en: "Fail",
      es: "Reprobado",
      fr: "Échoué",
      pt: "Reprovado",
      zh: "未通过",
      vi: "Không đạt",
      ko: "불합격",
      tl: "Hindi Pumasa"
    },
    tests: {
      en: "tests",
      es: "pruebas",
      fr: "tests",
      pt: "testes",
      zh: "测试",
      vi: "bài kiểm tra",
      ko: "테스트",
      tl: "mga pagsusulit"
    }
  },

  // Chemical/Titration
  chemicals: {
    chemicals: {
      en: "Chemicals",
      es: "Químicos",
      fr: "Produits Chimiques",
      pt: "Químicos",
      zh: "化学品",
      vi: "Hóa chất",
      ko: "화학물질",
      tl: "Mga Kemikal"
    },
    titration: {
      en: "Titration",
      es: "Titulación",
      fr: "Titration",
      pt: "Titulação",
      zh: "滴定",
      vi: "Chuẩn độ",
      ko: "적정",
      tl: "Titration"
    },
    inventory: {
      en: "Inventory",
      es: "Inventario",
      fr: "Inventaire",
      pt: "Inventário",
      zh: "库存",
      vi: "Kho hàng",
      ko: "재고",
      tl: "Imbentaryo"
    },
    inventoryCount: {
      en: "Inventory Count",
      es: "Conteo de Inventario",
      fr: "Comptage d'Inventaire",
      pt: "Contagem de Inventário",
      zh: "库存盘点",
      vi: "Kiểm kê",
      ko: "재고 확인",
      tl: "Bilang ng Imbentaryo"
    },
    chemicalInventory: {
      en: "Chemical Inventory",
      es: "Inventario de Químicos",
      fr: "Inventaire Chimique",
      pt: "Inventário Químico",
      zh: "化学品库存",
      vi: "Kho hóa chất",
      ko: "화학물질 재고",
      tl: "Imbentaryo ng Kemikal"
    },
    chemicalTitrations: {
      en: "Chemical Titrations",
      es: "Titulaciones Químicas",
      fr: "Titrations Chimiques",
      pt: "Titulações Químicas",
      zh: "化学滴定",
      vi: "Chuẩn độ hóa chất",
      ko: "화학 적정",
      tl: "Mga Titration ng Kemikal"
    },
    allChemicalTitrations: {
      en: "All Chemical Titrations",
      es: "Todas las Titulaciones Químicas",
      fr: "Toutes les Titrations Chimiques",
      pt: "Todas as Titulações Químicas",
      zh: "所有化学滴定",
      vi: "Tất cả chuẩn độ hóa chất",
      ko: "모든 화학 적정",
      tl: "Lahat ng Titration ng Kemikal"
    },
    allTitrationsCompleted: {
      en: "All titrations completed this period",
      es: "Todas las titulaciones completadas este período",
      fr: "Toutes les titrations terminées cette période",
      pt: "Todas as titulações concluídas neste período",
      zh: "本周期所有滴定已完成",
      vi: "Tất cả chuẩn độ đã hoàn thành trong kỳ này",
      ko: "이번 기간의 모든 적정 완료",
      tl: "Lahat ng titration ay natapos sa panahong ito"
    },
    startCount: {
      en: "Start Count",
      es: "Iniciar Conteo",
      fr: "Démarrer le Comptage",
      pt: "Iniciar Contagem",
      zh: "开始盘点",
      vi: "Bắt đầu kiểm đếm",
      ko: "카운트 시작",
      tl: "Simulan ang Bilang"
    }
  },

  // Status labels
  status: {
    completed: {
      en: "Completed",
      es: "Completado",
      fr: "Terminé",
      pt: "Concluído",
      zh: "已完成",
      vi: "Đã hoàn thành",
      ko: "완료됨",
      tl: "Natapos"
    },
    inProgress: {
      en: "In Progress",
      es: "En Progreso",
      fr: "En Cours",
      pt: "Em Progresso",
      zh: "进行中",
      vi: "Đang tiến hành",
      ko: "진행 중",
      tl: "Kasalukuyang Ginagawa"
    },
    notStarted: {
      en: "Not Started",
      es: "No Iniciado",
      fr: "Non Commencé",
      pt: "Não Iniciado",
      zh: "未开始",
      vi: "Chưa bắt đầu",
      ko: "시작되지 않음",
      tl: "Hindi pa Nasimulan"
    },
    overdue: {
      en: "Overdue",
      es: "Atrasado",
      fr: "En Retard",
      pt: "Atrasado",
      zh: "已逾期",
      vi: "Quá hạn",
      ko: "기한 초과",
      tl: "Nakalipas na"
    },
    verified: {
      en: "Verified",
      es: "Verificado",
      fr: "Vérifié",
      pt: "Verificado",
      zh: "已验证",
      vi: "Đã xác minh",
      ko: "검증됨",
      tl: "Na-verify"
    },
    archived: {
      en: "Archived",
      es: "Archivado",
      fr: "Archivé",
      pt: "Arquivado",
      zh: "已归档",
      vi: "Đã lưu trữ",
      ko: "보관됨",
      tl: "Na-archive"
    },
    active: {
      en: "active",
      es: "activo",
      fr: "actif",
      pt: "ativo",
      zh: "活跃",
      vi: "hoạt động",
      ko: "활성",
      tl: "aktibo"
    },
    incomplete: {
      en: "incomplete",
      es: "incompleto",
      fr: "incomplet",
      pt: "incompleto",
      zh: "未完成",
      vi: "chưa hoàn thành",
      ko: "미완료",
      tl: "hindi kumpleto"
    },
    locked: {
      en: "Locked",
      es: "Bloqueado",
      fr: "Verrouillé",
      pt: "Bloqueado",
      zh: "已锁定",
      vi: "Đã khóa",
      ko: "잠김",
      tl: "Naka-lock"
    },
    pendingSync: {
      en: "Pending Sync",
      es: "Sincronización Pendiente",
      fr: "Synchronisation en Attente",
      pt: "Sincronização Pendente",
      zh: "待同步",
      vi: "Đang chờ đồng bộ",
      ko: "동기화 대기 중",
      tl: "Naghihintay ng Sync"
    },
    synced: {
      en: "Synced",
      es: "Sincronizado",
      fr: "Synchronisé",
      pt: "Sincronizado",
      zh: "已同步",
      vi: "Đã đồng bộ",
      ko: "동기화됨",
      tl: "Na-sync na"
    },
    syncing: {
      en: "Syncing",
      es: "Sincronizando",
      fr: "Synchronisation",
      pt: "Sincronizando",
      zh: "同步中",
      vi: "Đang đồng bộ",
      ko: "동기화 중",
      tl: "Nagsi-sync"
    }
  },
  
  // Line Cleaning related
  lineCleaning: {
    progress: {
      en: "Progress",
      es: "Progreso",
      fr: "Progrès",
      pt: "Progresso",
      zh: "进度",
      vi: "Tiến độ",
      ko: "진행률",
      tl: "Progreso"
    },
    assetsPassedInspection: {
      en: "assets passed inspection",
      es: "activos pasaron la inspección",
      fr: "actifs ont passé l'inspection",
      pt: "ativos passaram na inspeção",
      zh: "资产通过检查",
      vi: "tài sản đã qua kiểm tra",
      ko: "자산 검사 통과",
      tl: "mga asset na pumasa sa inspeksyon"
    },
    markLineCleaningComplete: {
      en: "Mark Line Cleaning as Complete",
      es: "Marcar Limpieza de Línea como Completa",
      fr: "Marquer le Nettoyage de Ligne comme Terminé",
      pt: "Marcar Limpeza de Linha como Concluída",
      zh: "标记生产线清洁为完成",
      vi: "Đánh dấu Vệ sinh Dây chuyền là Hoàn thành",
      ko: "라인 청소 완료로 표시",
      tl: "Markahan ang Paglilinis ng Linya bilang Tapos"
    },
    awaitingInspection: {
      en: "Awaiting Inspection",
      es: "Esperando Inspección",
      fr: "En Attente d'Inspection",
      pt: "Aguardando Inspeção",
      zh: "等待检查",
      vi: "Đang chờ Kiểm tra",
      ko: "검사 대기 중",
      tl: "Naghihintay ng Inspeksyon"
    },
    failedRecleanRequired: {
      en: "Failed - Re-clean Required",
      es: "Fallido - Requiere Relimpieza",
      fr: "Échoué - Nettoyage Requis",
      pt: "Falhou - Relimpeza Necessária",
      zh: "失败 - 需要重新清洁",
      vi: "Thất bại - Cần Vệ sinh Lại",
      ko: "실패 - 재청소 필요",
      tl: "Nabigo - Kailangang Linisin Muli"
    },
    cleanedBy: {
      en: "Cleaned by",
      es: "Limpiado por",
      fr: "Nettoyé par",
      pt: "Limpo por",
      zh: "清洁者",
      vi: "Vệ sinh bởi",
      ko: "청소자",
      tl: "Nilinis ni"
    },
    time: {
      en: "Time",
      es: "Tiempo",
      fr: "Temps",
      pt: "Tempo",
      zh: "时间",
      vi: "Thời gian",
      ko: "시간",
      tl: "Oras"
    },
    notes: {
      en: "Notes",
      es: "Notas",
      fr: "Notes",
      pt: "Notas",
      zh: "备注",
      vi: "Ghi chú",
      ko: "메모",
      tl: "Mga Tala"
    },
    rluValue: {
      en: "RLU Value",
      es: "Valor RLU",
      fr: "Valeur RLU",
      pt: "Valor RLU",
      zh: "RLU值",
      vi: "Giá trị RLU",
      ko: "RLU 값",
      tl: "RLU Value"
    },
    atpNotes: {
      en: "ATP Notes",
      es: "Notas ATP",
      fr: "Notes ATP",
      pt: "Notas ATP",
      zh: "ATP备注",
      vi: "Ghi chú ATP",
      ko: "ATP 메모",
      tl: "Mga Tala ng ATP"
    },
    retest: {
      en: "Retest",
      es: "Reprueba",
      fr: "Retest",
      pt: "Reteste",
      zh: "重新测试",
      vi: "Kiểm tra lại",
      ko: "재검사",
      tl: "Muling Pagsubok"
    },
    inspectorNotes: {
      en: "Inspector Notes",
      es: "Notas del Inspector",
      fr: "Notes de l'Inspecteur",
      pt: "Notas do Inspetor",
      zh: "检查员备注",
      vi: "Ghi chú của Thanh tra viên",
      ko: "검사관 메모",
      tl: "Mga Tala ng Tagasuri"
    },
    recleanSignOff: {
      en: "Re-clean & Sign Off",
      es: "Relimpiar y Firmar",
      fr: "Renettoyer et Signer",
      pt: "Relimpar e Assinar",
      zh: "重新清洁并签字",
      vi: "Vệ sinh lại và Ký",
      ko: "재청소 및 서명",
      tl: "Linisin Muli at Pirmahan"
    },
    signOff: {
      en: "Sign Off",
      es: "Firmar",
      fr: "Signer",
      pt: "Assinar",
      zh: "签字",
      vi: "Ký",
      ko: "서명",
      tl: "Pirmahan"
    },
    signOffAsset: {
      en: "Sign Off Asset",
      es: "Firmar Activo",
      fr: "Signer l'Actif",
      pt: "Assinar Ativo",
      zh: "签字资产",
      vi: "Ký Tài sản",
      ko: "자산 서명",
      tl: "Pirmahan ang Asset"
    },
    hoursWorked: {
      en: "Hours Worked",
      es: "Horas Trabajadas",
      fr: "Heures Travaillées",
      pt: "Horas Trabalhadas",
      zh: "工作时间",
      vi: "Số giờ làm việc",
      ko: "근무 시간",
      tl: "Oras na Nagtrabaho"
    },
    cleaningNotesPlaceholder: {
      en: "Any notes about the cleaning...",
      es: "Notas sobre la limpieza...",
      fr: "Notes sur le nettoyage...",
      pt: "Notas sobre a limpeza...",
      zh: "关于清洁的备注...",
      vi: "Ghi chú về việc vệ sinh...",
      ko: "청소에 대한 메모...",
      tl: "Mga tala tungkol sa paglilinis..."
    },
    atpSwabTestRequired: {
      en: "ATP Swab Test Required",
      es: "Prueba de Hisopo ATP Requerida",
      fr: "Test ATP Requis",
      pt: "Teste de Swab ATP Necessário",
      zh: "需要ATP拭子测试",
      vi: "Yêu cầu Xét nghiệm ATP",
      ko: "ATP 스왑 테스트 필요",
      tl: "Kinakailangang ATP Swab Test"
    },
    atpTestResult: {
      en: "ATP Test Result",
      es: "Resultado de la Prueba ATP",
      fr: "Résultat du Test ATP",
      pt: "Resultado do Teste ATP",
      zh: "ATP测试结果",
      vi: "Kết quả Xét nghiệm ATP",
      ko: "ATP 테스트 결과",
      tl: "Resulta ng ATP Test"
    },
    selectResult: {
      en: "Select result",
      es: "Seleccionar resultado",
      fr: "Sélectionner le résultat",
      pt: "Selecionar resultado",
      zh: "选择结果",
      vi: "Chọn kết quả",
      ko: "결과 선택",
      tl: "Pumili ng resulta"
    },
    atpComments: {
      en: "ATP Comments",
      es: "Comentarios ATP",
      fr: "Commentaires ATP",
      pt: "Comentários ATP",
      zh: "ATP评论",
      vi: "Nhận xét ATP",
      ko: "ATP 의견",
      tl: "Mga Komento ng ATP"
    },
    atpFailedPlaceholder: {
      en: "Required for failed tests - describe the issue and corrective action...",
      es: "Requerido para pruebas fallidas - describa el problema y la acción correctiva...",
      fr: "Requis pour les tests échoués - décrivez le problème et l'action corrective...",
      pt: "Necessário para testes falhados - descreva o problema e a ação corretiva...",
      zh: "失败测试必填 - 描述问题和纠正措施...",
      vi: "Bắt buộc cho các bài kiểm tra không đạt - mô tả vấn đề và hành động khắc phục...",
      ko: "실패한 테스트에 필수 - 문제와 시정 조치를 설명하세요...",
      tl: "Kinakailangan para sa mga nabigong pagsusulit - ilarawan ang isyu at corrective action..."
    },
    atpPassedPlaceholder: {
      en: "Optional notes about the test...",
      es: "Notas opcionales sobre la prueba...",
      fr: "Notes optionnelles sur le test...",
      pt: "Notas opcionais sobre o teste...",
      zh: "关于测试的可选备注...",
      vi: "Ghi chú tùy chọn về bài kiểm tra...",
      ko: "테스트에 대한 선택적 메모...",
      tl: "Opsyonal na mga tala tungkol sa pagsusulit..."
    },
    atpCommentsMandatory: {
      en: "Comments are mandatory for failed ATP tests",
      es: "Los comentarios son obligatorios para las pruebas ATP fallidas",
      fr: "Les commentaires sont obligatoires pour les tests ATP échoués",
      pt: "Comentários são obrigatórios para testes ATP falhados",
      zh: "ATP测试失败时必须填写评论",
      vi: "Nhận xét là bắt buộc cho các bài kiểm tra ATP không đạt",
      ko: "실패한 ATP 테스트에는 의견이 필수입니다",
      tl: "Kinakailangan ang mga komento para sa mga nabigong ATP test"
    },
    signToConfirmCompletion: {
      en: "Please sign above to confirm completion",
      es: "Por favor firme arriba para confirmar la finalización",
      fr: "Veuillez signer ci-dessus pour confirmer l'achèvement",
      pt: "Por favor assine acima para confirmar a conclusão",
      zh: "请在上方签名确认完成",
      vi: "Vui lòng ký ở trên để xác nhận hoàn thành",
      ko: "완료를 확인하려면 위에 서명하세요",
      tl: "Mangyaring pumirma sa itaas para kumpirmahin ang pagkumpleto"
    },
    noAssetsRequireInspection: {
      en: "No assets require inspection",
      es: "Ningún activo requiere inspección",
      fr: "Aucun actif ne nécessite d'inspection",
      pt: "Nenhum ativo requer inspeção",
      zh: "没有资产需要检查",
      vi: "Không có tài sản nào cần kiểm tra",
      ko: "검사가 필요한 자산이 없습니다",
      tl: "Walang asset na nangangailangan ng inspeksyon"
    },
    inspectionResult: {
      en: "Inspection Result",
      es: "Resultado de la Inspección",
      fr: "Résultat de l'Inspection",
      pt: "Resultado da Inspeção",
      zh: "检查结果",
      vi: "Kết quả Kiểm tra",
      ko: "검사 결과",
      tl: "Resulta ng Inspeksyon"
    },
    commentsRequiredFailed: {
      en: "Comments (Required for Failed Items)",
      es: "Comentarios (Requerido para Artículos Fallidos)",
      fr: "Commentaires (Requis pour les Éléments Échoués)",
      pt: "Comentários (Obrigatório para Itens Falhados)",
      zh: "评论（失败项目必填）",
      vi: "Nhận xét (Bắt buộc cho các mục không đạt)",
      ko: "의견 (실패 항목 필수)",
      tl: "Mga Komento (Kinakailangan para sa mga Nabigong Aytem)"
    },
    commentsOptional: {
      en: "Comments",
      es: "Comentarios",
      fr: "Commentaires",
      pt: "Comentários",
      zh: "评论",
      vi: "Nhận xét",
      ko: "의견",
      tl: "Mga Komento"
    },
    describeIssuesFound: {
      en: "Describe the issues found...",
      es: "Describa los problemas encontrados...",
      fr: "Décrivez les problèmes trouvés...",
      pt: "Descreva os problemas encontrados...",
      zh: "描述发现的问题...",
      vi: "Mô tả các vấn đề được tìm thấy...",
      ko: "발견된 문제를 설명하세요...",
      tl: "Ilarawan ang mga isyung natagpuan..."
    },
    additionalNotesPlaceholder: {
      en: "Any additional notes...",
      es: "Notas adicionales...",
      fr: "Notes supplémentaires...",
      pt: "Notas adicionais...",
      zh: "其他备注...",
      vi: "Ghi chú bổ sung...",
      ko: "추가 메모...",
      tl: "Mga karagdagang tala..."
    },
    inspectorSignature: {
      en: "Inspector Signature",
      es: "Firma del Inspector",
      fr: "Signature de l'Inspecteur",
      pt: "Assinatura do Inspetor",
      zh: "检查员签名",
      vi: "Chữ ký Thanh tra viên",
      ko: "검사관 서명",
      tl: "Lagda ng Tagasuri"
    },
    inspectorMustSign: {
      en: "Inspector must sign to certify inspection",
      es: "El inspector debe firmar para certificar la inspección",
      fr: "L'inspecteur doit signer pour certifier l'inspection",
      pt: "O inspetor deve assinar para certificar a inspeção",
      zh: "检查员必须签名以证明检查",
      vi: "Thanh tra viên phải ký để xác nhận kiểm tra",
      ko: "검사관은 검사를 인증하기 위해 서명해야 합니다",
      tl: "Dapat pumirma ang tagasuri para patunayan ang inspeksyon"
    },
    submitInspection: {
      en: "Submit Inspection",
      es: "Enviar Inspección",
      fr: "Soumettre l'Inspection",
      pt: "Enviar Inspeção",
      zh: "提交检查",
      vi: "Gửi Kiểm tra",
      ko: "검사 제출",
      tl: "Isumite ang Inspeksyon"
    }
  },
  
  // Offline related
  offline: {
    currentlyOffline: {
      en: "You're currently offline",
      es: "Estás actualmente sin conexión",
      fr: "Vous êtes actuellement hors ligne",
      pt: "Você está offline",
      zh: "您当前处于离线状态",
      vi: "Bạn hiện đang ngoại tuyến",
      ko: "현재 오프라인 상태입니다",
      tl: "Kasalukuyan kang offline"
    },
    willSyncWhenOnline: {
      en: "Your completion will be saved with a timestamp and synced when you're back online.",
      es: "Su finalización se guardará con una marca de tiempo y se sincronizará cuando vuelva a estar en línea.",
      fr: "Votre achèvement sera enregistré avec un horodatage et synchronisé lorsque vous serez de nouveau en ligne.",
      pt: "Sua conclusão será salva com um registro de data e hora e sincronizada quando você estiver online novamente.",
      zh: "您的完成将保存时间戳，并在您重新上线时同步。",
      vi: "Hoàn thành của bạn sẽ được lưu với dấu thời gian và đồng bộ khi bạn trực tuyến trở lại.",
      ko: "완료 내용은 타임스탬프와 함께 저장되고 온라인 상태가 되면 동기화됩니다.",
      tl: "Ang iyong pagkumpleto ay ise-save na may timestamp at isi-sync kapag bumalik ka sa online."
    },
    completionRecordedAt: {
      en: "Completion recorded at",
      es: "Finalización registrada a las",
      fr: "Achèvement enregistré à",
      pt: "Conclusão registrada às",
      zh: "完成记录于",
      vi: "Hoàn thành được ghi nhận lúc",
      ko: "완료 기록 시간",
      tl: "Naitala ang pagkumpleto sa"
    },
    willSyncOnline: {
      en: "will sync when online",
      es: "se sincronizará cuando esté en línea",
      fr: "sera synchronisé une fois en ligne",
      pt: "será sincronizado quando online",
      zh: "将在上线时同步",
      vi: "sẽ đồng bộ khi trực tuyến",
      ko: "온라인 시 동기화됨",
      tl: "isi-sync kapag online"
    },
    saveOffline: {
      en: "Save Offline",
      es: "Guardar Sin Conexión",
      fr: "Enregistrer Hors Ligne",
      pt: "Salvar Offline",
      zh: "离线保存",
      vi: "Lưu ngoại tuyến",
      ko: "오프라인 저장",
      tl: "I-save Offline"
    }
  },

  // Time related
  time: {
    days: {
      en: "days",
      es: "días",
      fr: "jours",
      pt: "dias",
      zh: "天",
      vi: "ngày",
      ko: "일",
      tl: "araw"
    },
    today: {
      en: "Today",
      es: "Hoy",
      fr: "Aujourd'hui",
      pt: "Hoje",
      zh: "今天",
      vi: "Hôm nay",
      ko: "오늘",
      tl: "Ngayon"
    },
    yesterday: {
      en: "Yesterday",
      es: "Ayer",
      fr: "Hier",
      pt: "Ontem",
      zh: "昨天",
      vi: "Hôm qua",
      ko: "어제",
      tl: "Kahapon"
    },
    tomorrow: {
      en: "Tomorrow",
      es: "Mañana",
      fr: "Demain",
      pt: "Amanhã",
      zh: "明天",
      vi: "Ngày mai",
      ko: "내일",
      tl: "Bukas"
    },
    thisWeek: {
      en: "This Week",
      es: "Esta Semana",
      fr: "Cette Semaine",
      pt: "Esta Semana",
      zh: "本周",
      vi: "Tuần này",
      ko: "이번 주",
      tl: "Ngayong Linggo"
    },
    expires: {
      en: "Expires",
      es: "Expira",
      fr: "Expire",
      pt: "Expira",
      zh: "过期",
      vi: "Hết hạn",
      ko: "만료",
      tl: "Mag-e-expire"
    }
  },

  // Schedule related
  schedule: {
    mySchedule: {
      en: "My Schedule",
      es: "Mi Horario",
      fr: "Mon Horaire",
      pt: "Minha Agenda",
      zh: "我的日程",
      vi: "Lịch của tôi",
      ko: "내 일정",
      tl: "Aking Iskedyul"
    },
    scheduled: {
      en: "Scheduled",
      es: "Programado",
      fr: "Programmé",
      pt: "Agendado",
      zh: "已安排",
      vi: "Đã lên lịch",
      ko: "예정됨",
      tl: "Nakaplanao"
    },
    off: {
      en: "Off",
      es: "Libre",
      fr: "Congé",
      pt: "Folga",
      zh: "休息",
      vi: "Nghỉ",
      ko: "휴무",
      tl: "Day-off"
    },
    vacation: {
      en: "Vacation",
      es: "Vacaciones",
      fr: "Vacances",
      pt: "Férias",
      zh: "假期",
      vi: "Nghỉ phép",
      ko: "휴가",
      tl: "Bakasyon"
    },
    offDay: {
      en: "Off Day",
      es: "Día Libre",
      fr: "Jour de Congé",
      pt: "Dia de Folga",
      zh: "休息日",
      vi: "Ngày nghỉ",
      ko: "휴무일",
      tl: "Araw ng Pahinga"
    }
  },

  // Recommendations
  recommendations: {
    coverageGap: {
      en: "Coverage Gap",
      es: "Vacío de Cobertura",
      fr: "Lacune de Couverture",
      pt: "Lacuna de Cobertura",
      zh: "覆盖缺口",
      vi: "Khoảng trống phủ sóng",
      ko: "커버리지 갭",
      tl: "Coverage Gap"
    },
    skillBuilding: {
      en: "Skill Building",
      es: "Desarrollo de Habilidades",
      fr: "Développement de Compétences",
      pt: "Desenvolvimento de Habilidades",
      zh: "技能培养",
      vi: "Xây dựng kỹ năng",
      ko: "스킬 개발",
      tl: "Pagbuo ng Kakayahan"
    },
    backlog: {
      en: "Backlog",
      es: "Pendientes",
      fr: "En attente",
      pt: "Pendências",
      zh: "待办",
      vi: "Tồn đọng",
      ko: "백로그",
      tl: "Backlog"
    },
    highPriority: {
      en: "High Priority",
      es: "Alta Prioridad",
      fr: "Haute Priorité",
      pt: "Alta Prioridade",
      zh: "高优先级",
      vi: "Ưu tiên cao",
      ko: "높은 우선순위",
      tl: "Mataas na Priyoridad"
    },
    crossTraining: {
      en: "Cross-Training",
      es: "Capacitación Cruzada",
      fr: "Formation Croisée",
      pt: "Treinamento Cruzado",
      zh: "交叉培训",
      vi: "Đào tạo chéo",
      ko: "교차 훈련",
      tl: "Cross-Training"
    },
    trainingOpportunity: {
      en: "Training Opportunity",
      es: "Oportunidad de Capacitación",
      fr: "Opportunité de Formation",
      pt: "Oportunidade de Treinamento",
      zh: "培训机会",
      vi: "Cơ hội đào tạo",
      ko: "교육 기회",
      tl: "Oportunidad ng Pagsasanay"
    },
    suggested: {
      en: "Suggested",
      es: "Sugerido",
      fr: "Suggéré",
      pt: "Sugerido",
      zh: "建议",
      vi: "Đề xuất",
      ko: "추천",
      tl: "Iminumungkahi"
    }
  },

  // Anonymous Feedback
  anonymousFeedback: {
    title: {
      en: "Anonymous Feedback to Manager",
      es: "Retroalimentación Anónima al Gerente",
      fr: "Retour Anonyme au Manager",
      pt: "Feedback Anônimo para o Gerente",
      zh: "匿名反馈给经理",
      vi: "Phản hồi ẩn danh cho quản lý",
      ko: "관리자에게 익명 피드백",
      tl: "Anonymous na Feedback sa Manager"
    },
    disclaimer: {
      en: "Your name will not be included with this feedback. It will be sent anonymously to your manager.",
      es: "Su nombre no se incluirá con este comentario. Se enviará de forma anónima a su gerente.",
      fr: "Votre nom ne sera pas inclus avec ce retour. Il sera envoyé anonymement à votre manager.",
      pt: "Seu nome não será incluído neste feedback. Ele será enviado anonimamente ao seu gerente.",
      zh: "您的姓名不会包含在此反馈中。它将匿名发送给您的经理。",
      vi: "Tên của bạn sẽ không được bao gồm trong phản hồi này. Nó sẽ được gửi ẩn danh đến quản lý của bạn.",
      ko: "이름은 이 피드백에 포함되지 않습니다. 익명으로 관리자에게 전송됩니다.",
      tl: "Ang iyong pangalan ay hindi isasama sa feedback na ito. Ito ay ipapadala nang anonymous sa iyong manager."
    },
    recognition: {
      en: "Recognition/Praise",
      es: "Reconocimiento/Elogio",
      fr: "Reconnaissance/Éloge",
      pt: "Reconhecimento/Elogio",
      zh: "认可/表扬",
      vi: "Công nhận/Khen ngợi",
      ko: "인정/칭찬",
      tl: "Pagkilala/Papuri"
    },
    suggestion: {
      en: "Suggestion",
      es: "Sugerencia",
      fr: "Suggestion",
      pt: "Sugestão",
      zh: "建议",
      vi: "Đề xuất",
      ko: "제안",
      tl: "Suhestyon"
    },
    concern: {
      en: "Concern",
      es: "Preocupación",
      fr: "Préoccupation",
      pt: "Preocupação",
      zh: "关切",
      vi: "Lo ngại",
      ko: "우려",
      tl: "Alalahanin"
    },
    yourFeedback: {
      en: "Your Feedback",
      es: "Su Comentario",
      fr: "Votre Retour",
      pt: "Seu Feedback",
      zh: "您的反馈",
      vi: "Phản hồi của bạn",
      ko: "피드백",
      tl: "Ang Iyong Feedback"
    },
    placeholder: {
      en: "Share your thoughts, suggestions, or recognition...",
      es: "Comparta sus pensamientos, sugerencias o reconocimientos...",
      fr: "Partagez vos pensées, suggestions ou reconnaissances...",
      pt: "Compartilhe seus pensamentos, sugestões ou reconhecimentos...",
      zh: "分享您的想法、建议或认可...",
      vi: "Chia sẻ suy nghĩ, đề xuất hoặc sự công nhận của bạn...",
      ko: "생각, 제안 또는 인정을 공유하세요...",
      tl: "Ibahagi ang iyong mga saloobin, suhestyon, o pagkilala..."
    },
    submitAnonymously: {
      en: "Submit Anonymously",
      es: "Enviar Anónimamente",
      fr: "Soumettre Anonymement",
      pt: "Enviar Anonimamente",
      zh: "匿名提交",
      vi: "Gửi ẩn danh",
      ko: "익명으로 제출",
      tl: "Isumite nang Anonymous"
    }
  },

  // Peer Feedback
  peerFeedback: {
    givePositiveFeedback: {
      en: "Give Positive Feedback",
      es: "Dar Retroalimentación Positiva",
      fr: "Donner un Retour Positif",
      pt: "Dar Feedback Positivo",
      zh: "给予正面反馈",
      vi: "Đưa phản hồi tích cực",
      ko: "긍정적 피드백 제공",
      tl: "Magbigay ng Positibong Feedback"
    },
    givePositiveFeedbackTo: {
      en: "Give Positive Feedback to",
      es: "Dar Retroalimentación Positiva a",
      fr: "Donner un Retour Positif à",
      pt: "Dar Feedback Positivo para",
      zh: "给予正面反馈给",
      vi: "Đưa phản hồi tích cực cho",
      ko: "긍정적 피드백 제공 대상",
      tl: "Magbigay ng Positibong Feedback kay"
    },
    selectColleague: {
      en: "Select Colleague",
      es: "Seleccionar Compañero",
      fr: "Sélectionner un Collègue",
      pt: "Selecionar Colega",
      zh: "选择同事",
      vi: "Chọn đồng nghiệp",
      ko: "동료 선택",
      tl: "Pumili ng Kasamahan"
    },
    chooseColleague: {
      en: "Choose a colleague...",
      es: "Elija un compañero...",
      fr: "Choisissez un collègue...",
      pt: "Escolha um colega...",
      zh: "选择一位同事...",
      vi: "Chọn một đồng nghiệp...",
      ko: "동료를 선택하세요...",
      tl: "Pumili ng kasamahan..."
    },
    category: {
      en: "Category",
      es: "Categoría",
      fr: "Catégorie",
      pt: "Categoria",
      zh: "类别",
      vi: "Danh mục",
      ko: "카테고리",
      tl: "Kategorya"
    },
    selectMessage: {
      en: "Select a Message",
      es: "Seleccionar un Mensaje",
      fr: "Sélectionner un Message",
      pt: "Selecionar uma Mensagem",
      zh: "选择一条消息",
      vi: "Chọn một tin nhắn",
      ko: "메시지 선택",
      tl: "Pumili ng Mensahe"
    },
    sendFeedback: {
      en: "Send Feedback",
      es: "Enviar Retroalimentación",
      fr: "Envoyer le Retour",
      pt: "Enviar Feedback",
      zh: "发送反馈",
      vi: "Gửi phản hồi",
      ko: "피드백 보내기",
      tl: "Ipadala ang Feedback"
    },
    teamwork: {
      en: "Teamwork",
      es: "Trabajo en Equipo",
      fr: "Travail d'Équipe",
      pt: "Trabalho em Equipe",
      zh: "团队合作",
      vi: "Làm việc nhóm",
      ko: "팀워크",
      tl: "Pagtutulungan"
    },
    communicationCat: {
      en: "Communication",
      es: "Comunicación",
      fr: "Communication",
      pt: "Comunicação",
      zh: "沟通",
      vi: "Giao tiếp",
      ko: "의사소통",
      tl: "Komunikasyon"
    },
    qualityWork: {
      en: "Quality Work",
      es: "Trabajo de Calidad",
      fr: "Travail de Qualité",
      pt: "Trabalho de Qualidade",
      zh: "优质工作",
      vi: "Công việc chất lượng",
      ko: "양질의 작업",
      tl: "Kalidad na Trabaho"
    },
    initiativeCat: {
      en: "Initiative",
      es: "Iniciativa",
      fr: "Initiative",
      pt: "Iniciativa",
      zh: "主动性",
      vi: "Chủ động",
      ko: "주도성",
      tl: "Inisyatiba"
    },
    helpfulness: {
      en: "Helpfulness",
      es: "Disposición a Ayudar",
      fr: "Serviabilité",
      pt: "Prestatividade",
      zh: "乐于助人",
      vi: "Sự hữu ích",
      ko: "도움됨",
      tl: "Pagiging Matulungin"
    },
    other: {
      en: "Other",
      es: "Otro",
      fr: "Autre",
      pt: "Outro",
      zh: "其他",
      vi: "Khác",
      ko: "기타",
      tl: "Iba pa"
    },
    // Teamwork messages
    teamwork1: {
      en: "Great collaboration on the team!",
      es: "¡Excelente colaboración en el equipo!",
      fr: "Excellente collaboration dans l'équipe!",
      pt: "Ótima colaboração na equipe!",
      zh: "团队合作很棒！",
      vi: "Hợp tác tuyệt vời trong nhóm!",
      ko: "팀에서 훌륭한 협업!",
      tl: "Mahusay na pagtutulungan sa team!"
    },
    teamwork2: {
      en: "You work really well with others.",
      es: "Trabajas muy bien con los demás.",
      fr: "Tu travailles très bien avec les autres.",
      pt: "Você trabalha muito bem com os outros.",
      zh: "你与他人合作得很好。",
      vi: "Bạn làm việc rất tốt với người khác.",
      ko: "다른 사람들과 정말 잘 일해요.",
      tl: "Mahusay kang makipagtulungan sa iba."
    },
    teamwork3: {
      en: "Thanks for being such a good team player.",
      es: "Gracias por ser tan buen compañero de equipo.",
      fr: "Merci d'être un si bon coéquipier.",
      pt: "Obrigado por ser um ótimo jogador de equipe.",
      zh: "感谢你成为如此好的团队成员。",
      vi: "Cảm ơn bạn đã là một thành viên tốt trong nhóm.",
      ko: "좋은 팀원이 되어줘서 고마워요.",
      tl: "Salamat sa pagiging mahusay na kasapi ng team."
    },
    teamwork4: {
      en: "I appreciate how you support the team.",
      es: "Aprecio cómo apoyas al equipo.",
      fr: "J'apprécie la façon dont tu soutiens l'équipe.",
      pt: "Eu aprecio como você apoia a equipe.",
      zh: "感谢你对团队的支持。",
      vi: "Tôi đánh giá cao cách bạn hỗ trợ nhóm.",
      ko: "팀을 지원하는 방식이 감사해요.",
      tl: "Pinahahalagahan ko kung paano mo sinusuportahan ang team."
    },
    // Communication messages
    communication1: {
      en: "You communicate clearly and effectively.",
      es: "Te comunicas de manera clara y efectiva.",
      fr: "Tu communiques clairement et efficacement.",
      pt: "Você se comunica de forma clara e eficaz.",
      zh: "你沟通清晰有效。",
      vi: "Bạn giao tiếp rõ ràng và hiệu quả.",
      ko: "명확하고 효과적으로 소통해요.",
      tl: "Malinaw at epektibo kang makipag-usap."
    },
    communication2: {
      en: "Great job explaining things clearly.",
      es: "Buen trabajo explicando las cosas claramente.",
      fr: "Bon travail pour expliquer les choses clairement.",
      pt: "Ótimo trabalho explicando as coisas claramente.",
      zh: "解释清楚做得很好。",
      vi: "Làm tốt lắm khi giải thích rõ ràng.",
      ko: "명확하게 설명하는 것 잘하네요.",
      tl: "Mahusay sa pagpapaliwanag ng mga bagay nang malinaw."
    },
    communication3: {
      en: "I appreciate your open communication.",
      es: "Aprecio tu comunicación abierta.",
      fr: "J'apprécie ta communication ouverte.",
      pt: "Eu aprecio sua comunicação aberta.",
      zh: "感谢你的开放沟通。",
      vi: "Tôi đánh giá cao sự giao tiếp cởi mở của bạn.",
      ko: "열린 소통에 감사해요.",
      tl: "Pinahahalagahan ko ang iyong bukas na komunikasyon."
    },
    communication4: {
      en: "You listen well to others' ideas.",
      es: "Escuchas bien las ideas de los demás.",
      fr: "Tu écoutes bien les idées des autres.",
      pt: "Você ouve bem as ideias dos outros.",
      zh: "你善于倾听他人的想法。",
      vi: "Bạn lắng nghe ý kiến của người khác rất tốt.",
      ko: "다른 사람들의 의견을 잘 들어요.",
      tl: "Mahusay kang makinig sa ideya ng iba."
    },
    // Quality messages
    quality1: {
      en: "Your work quality is excellent.",
      es: "La calidad de tu trabajo es excelente.",
      fr: "La qualité de ton travail est excellente.",
      pt: "A qualidade do seu trabalho é excelente.",
      zh: "你的工作质量很棒。",
      vi: "Chất lượng công việc của bạn rất tuyệt vời.",
      ko: "작업 품질이 훌륭해요.",
      tl: "Mahusay ang kalidad ng iyong trabaho."
    },
    quality2: {
      en: "I'm impressed with the attention to detail.",
      es: "Estoy impresionado con tu atención al detalle.",
      fr: "Je suis impressionné par ton attention aux détails.",
      pt: "Estou impressionado com a atenção aos detalhes.",
      zh: "你对细节的关注让我印象深刻。",
      vi: "Tôi ấn tượng với sự chú ý đến chi tiết của bạn.",
      ko: "세부 사항에 대한 관심이 인상적이에요.",
      tl: "Humahanga ako sa iyong pansin sa detalye."
    },
    quality3: {
      en: "You consistently deliver great results.",
      es: "Entregas constantemente excelentes resultados.",
      fr: "Tu fournis constamment d'excellents résultats.",
      pt: "Você entrega consistentemente ótimos resultados.",
      zh: "你总是能交付出色的成果。",
      vi: "Bạn luôn mang lại kết quả tuyệt vời.",
      ko: "항상 훌륭한 결과를 제공해요.",
      tl: "Palagi kang naghahatid ng magagandang resulta."
    },
    quality4: {
      en: "The quality of your work is top-notch.",
      es: "La calidad de tu trabajo es de primera.",
      fr: "La qualité de ton travail est de premier ordre.",
      pt: "A qualidade do seu trabalho é de primeira.",
      zh: "你的工作质量一流。",
      vi: "Chất lượng công việc của bạn hàng đầu.",
      ko: "작업 품질이 최고 수준이에요.",
      tl: "Napakahusay ng kalidad ng iyong trabaho."
    },
    // Initiative messages
    initiative1: {
      en: "You show great initiative!",
      es: "¡Muestras gran iniciativa!",
      fr: "Tu montres une grande initiative!",
      pt: "Você mostra grande iniciativa!",
      zh: "你展现了很强的主动性！",
      vi: "Bạn thể hiện sự chủ động tuyệt vời!",
      ko: "훌륭한 주도성을 보여주네요!",
      tl: "Mahusay ang iyong inisyatiba!"
    },
    initiative2: {
      en: "I appreciate you taking the lead.",
      es: "Aprecio que tomes la iniciativa.",
      fr: "J'apprécie que tu prennes les devants.",
      pt: "Eu aprecio você tomar a liderança.",
      zh: "感谢你带头行动。",
      vi: "Tôi đánh giá cao việc bạn dẫn đầu.",
      ko: "앞장서 주셔서 감사해요.",
      tl: "Pinahahalagahan ko na ikaw ang nangunguna."
    },
    initiative3: {
      en: "You don't wait to be asked—great attitude.",
      es: "No esperas a que te lo pidan—gran actitud.",
      fr: "Tu n'attends pas qu'on te le demande—excellente attitude.",
      pt: "Você não espera ser solicitado—ótima atitude.",
      zh: "你不等别人开口就主动行动——很棒的态度。",
      vi: "Bạn không đợi được yêu cầu—thái độ tuyệt vời.",
      ko: "요청 받기 전에 행동해요—훌륭한 태도예요.",
      tl: "Hindi ka naghihintay na hilingin—magandang attitude."
    },
    initiative4: {
      en: "You're proactive and resourceful.",
      es: "Eres proactivo e ingenioso.",
      fr: "Tu es proactif et débrouillard.",
      pt: "Você é proativo e engenhoso.",
      zh: "你积极主动且足智多谋。",
      vi: "Bạn chủ động và tháo vát.",
      ko: "적극적이고 자원이 풍부해요.",
      tl: "Ikaw ay proactive at maparaan."
    },
    // Helpfulness messages
    helpfulness1: {
      en: "You're always willing to help others.",
      es: "Siempre estás dispuesto a ayudar a otros.",
      fr: "Tu es toujours prêt à aider les autres.",
      pt: "Você está sempre disposto a ajudar os outros.",
      zh: "你总是乐于助人。",
      vi: "Bạn luôn sẵn sàng giúp đỡ người khác.",
      ko: "항상 다른 사람들을 기꺼이 도와주네요.",
      tl: "Lagi kang handang tumulong sa iba."
    },
    helpfulness2: {
      en: "Thanks for being so helpful to the team.",
      es: "Gracias por ser tan servicial con el equipo.",
      fr: "Merci d'être si serviable envers l'équipe.",
      pt: "Obrigado por ser tão prestativo com a equipe.",
      zh: "感谢你对团队的帮助。",
      vi: "Cảm ơn bạn đã giúp đỡ nhóm nhiều như vậy.",
      ko: "팀에 많은 도움을 주셔서 감사해요.",
      tl: "Salamat sa pagiging matulungin sa team."
    },
    helpfulness3: {
      en: "I appreciate your willingness to pitch in.",
      es: "Aprecio tu disposición a colaborar.",
      fr: "J'apprécie ta volonté de contribuer.",
      pt: "Eu aprecio sua disposição em ajudar.",
      zh: "感谢你愿意参与帮忙。",
      vi: "Tôi đánh giá cao sự sẵn sàng góp sức của bạn.",
      ko: "기꺼이 도와주려는 마음에 감사해요.",
      tl: "Pinahahalagahan ko ang iyong kahandaang tumulong."
    },
    helpfulness4: {
      en: "You make others' jobs easier.",
      es: "Facilitas el trabajo de los demás.",
      fr: "Tu facilites le travail des autres.",
      pt: "Você facilita o trabalho dos outros.",
      zh: "你让别人的工作变得更轻松。",
      vi: "Bạn làm cho công việc của người khác dễ dàng hơn.",
      ko: "다른 사람들의 일을 더 쉽게 만들어줘요.",
      tl: "Pinapadali mo ang trabaho ng iba."
    },
    // Other messages
    other1: {
      en: "You're doing a great job!",
      es: "¡Estás haciendo un gran trabajo!",
      fr: "Tu fais du bon travail!",
      pt: "Você está fazendo um ótimo trabalho!",
      zh: "你做得很棒！",
      vi: "Bạn đang làm rất tốt!",
      ko: "정말 잘하고 있어요!",
      tl: "Magaling ang ginagawa mo!"
    },
    other2: {
      en: "Keep up the excellent work!",
      es: "¡Sigue con el excelente trabajo!",
      fr: "Continue l'excellent travail!",
      pt: "Continue com o excelente trabalho!",
      zh: "继续保持出色的工作！",
      vi: "Hãy tiếp tục công việc xuất sắc!",
      ko: "훌륭한 일을 계속해요!",
      tl: "Ipagpatuloy ang mahusay na trabaho!"
    },
    other3: {
      en: "I really appreciate what you do.",
      es: "Realmente aprecio lo que haces.",
      fr: "J'apprécie vraiment ce que tu fais.",
      pt: "Eu realmente aprecio o que você faz.",
      zh: "我真的很感激你所做的。",
      vi: "Tôi thực sự đánh giá cao những gì bạn làm.",
      ko: "당신이 하는 일에 정말 감사해요.",
      tl: "Talagang pinahahalagahan ko ang ginagawa mo."
    },
    other4: {
      en: "You're a valuable team member.",
      es: "Eres un miembro valioso del equipo.",
      fr: "Tu es un membre précieux de l'équipe.",
      pt: "Você é um membro valioso da equipe.",
      zh: "你是团队中宝贵的一员。",
      vi: "Bạn là một thành viên quý giá của nhóm.",
      ko: "당신은 소중한 팀원이에요.",
      tl: "Ikaw ay mahalagang kasapi ng team."
    }
  },

  // Performance/Stats
  performance: {
    lifetimePerformance: {
      en: "Lifetime Performance",
      es: "Rendimiento de por Vida",
      fr: "Performance Globale",
      pt: "Desempenho Vitalício",
      zh: "终身绩效",
      vi: "Hiệu suất Trọn đời",
      ko: "평생 성과",
      tl: "Panghabang-buhay na Performance"
    },
    rankingPool: {
      en: "Ranking Pool",
      es: "Grupo de Clasificación",
      fr: "Groupe de Classement",
      pt: "Grupo de Classificação",
      zh: "排名池",
      vi: "Nhóm xếp hạng",
      ko: "랭킹 풀",
      tl: "Ranking Pool"
    },
    currentRank: {
      en: "Current Rank",
      es: "Clasificación Actual",
      fr: "Classement Actuel",
      pt: "Classificação Atual",
      zh: "当前排名",
      vi: "Xếp hạng hiện tại",
      ko: "현재 순위",
      tl: "Kasalukuyang Ranggo"
    },
    bestRanking: {
      en: "Best Ranking",
      es: "Mejor Clasificación",
      fr: "Meilleur Classement",
      pt: "Melhor Classificação",
      zh: "最佳排名",
      vi: "Xếp hạng tốt nhất",
      ko: "최고 순위",
      tl: "Pinakamataas na Ranggo"
    },
    overallPerformance: {
      en: "Overall performance",
      es: "Rendimiento general",
      fr: "Performance globale",
      pt: "Desempenho geral",
      zh: "整体表现",
      vi: "Hiệu suất tổng thể",
      ko: "전체 성과",
      tl: "Pangkalahatang performance"
    },
    highestPosition: {
      en: "Highest position achieved",
      es: "Posición más alta alcanzada",
      fr: "Position la plus élevée atteinte",
      pt: "Posição mais alta alcançada",
      zh: "达到的最高位置",
      vi: "Vị trí cao nhất đạt được",
      ko: "달성한 최고 순위",
      tl: "Pinakamataas na posisyon na nakamit"
    },
    currentStreak: {
      en: "Current Streak",
      es: "Racha Actual",
      fr: "Série Actuelle",
      pt: "Sequência Atual",
      zh: "当前连续",
      vi: "Chuỗi hiện tại",
      ko: "현재 연속",
      tl: "Kasalukuyang Streak"
    },
    best: {
      en: "Best",
      es: "Mejor",
      fr: "Meilleur",
      pt: "Melhor",
      zh: "最佳",
      vi: "Tốt nhất",
      ko: "최고",
      tl: "Pinakamahusay"
    },
    legacy: {
      en: "legacy",
      es: "anterior",
      fr: "héritage",
      pt: "legado",
      zh: "历史",
      vi: "cũ",
      ko: "이전",
      tl: "lumang"
    },
    tasksCompleted: {
      en: "Tasks Completed",
      es: "Tareas Completadas",
      fr: "Tâches Terminées",
      pt: "Tarefas Concluídas",
      zh: "完成的任务",
      vi: "Nhiệm vụ đã hoàn thành",
      ko: "완료된 작업",
      tl: "Natapos na Gawain"
    },
    onTimeRate: {
      en: "On-Time Rate",
      es: "Tasa de Puntualidad",
      fr: "Taux de Ponctualité",
      pt: "Taxa de Pontualidade",
      zh: "准时率",
      vi: "Tỷ lệ đúng hạn",
      ko: "정시 완료율",
      tl: "On-Time Rate"
    },
    onTimeCompletion: {
      en: "On-Time Completion",
      es: "Completado a Tiempo",
      fr: "Achèvement à Temps",
      pt: "Conclusão no Prazo",
      zh: "准时完成",
      vi: "Hoàn thành đúng hạn",
      ko: "정시 완료",
      tl: "Natapos sa Oras"
    },
    totalHoursWorked: {
      en: "Total Hours Worked",
      es: "Horas Totales Trabajadas",
      fr: "Heures Totales Travaillées",
      pt: "Total de Horas Trabalhadas",
      zh: "总工作时数",
      vi: "Tổng số giờ làm việc",
      ko: "총 근무 시간",
      tl: "Kabuuang Oras na Nagtrabaho"
    },
    achievementsBadges: {
      en: "Achievements & Badges",
      es: "Logros y Medallas",
      fr: "Réalisations et Badges",
      pt: "Conquistas e Medalhas",
      zh: "成就和徽章",
      vi: "Thành tựu và Huy hiệu",
      ko: "업적 및 배지",
      tl: "Mga Nakamit at Badge"
    },
    leaderboardStandings: {
      en: "Leaderboard Standings",
      es: "Clasificación en la Tabla",
      fr: "Classement au Tableau",
      pt: "Classificação no Ranking",
      zh: "排行榜排名",
      vi: "Xếp hạng Bảng xếp hạng",
      ko: "리더보드 순위",
      tl: "Ranggo sa Leaderboard"
    }
  },

  // Messages/Alerts
  messages: {
    success: {
      en: "Success",
      es: "Éxito",
      fr: "Succès",
      pt: "Sucesso",
      zh: "成功",
      vi: "Thành công",
      ko: "성공",
      tl: "Tagumpay"
    },
    error: {
      en: "Error",
      es: "Error",
      fr: "Erreur",
      pt: "Erro",
      zh: "错误",
      vi: "Lỗi",
      ko: "오류",
      tl: "Error"
    },
    warning: {
      en: "Warning",
      es: "Advertencia",
      fr: "Avertissement",
      pt: "Aviso",
      zh: "警告",
      vi: "Cảnh báo",
      ko: "경고",
      tl: "Babala"
    },
    taskCompleted: {
      en: "Task completed successfully",
      es: "Tarea completada exitosamente",
      fr: "Tâche terminée avec succès",
      pt: "Tarefa concluída com sucesso",
      zh: "任务成功完成",
      vi: "Nhiệm vụ hoàn thành thành công",
      ko: "작업이 성공적으로 완료되었습니다",
      tl: "Matagumpay na natapos ang gawain"
    },
    pleaseSignature: {
      en: "Please provide your signature",
      es: "Por favor proporcione su firma",
      fr: "Veuillez fournir votre signature",
      pt: "Por favor forneça sua assinatura",
      zh: "请提供您的签名",
      vi: "Vui lòng cung cấp chữ ký của bạn",
      ko: "서명을 제공해 주세요",
      tl: "Mangyaring magbigay ng iyong lagda"
    },
    analyzingProfile: {
      en: "Analyzing your profile...",
      es: "Analizando tu perfil...",
      fr: "Analyse de votre profil...",
      pt: "Analisando seu perfil...",
      zh: "正在分析您的资料...",
      vi: "Đang phân tích hồ sơ của bạn...",
      ko: "프로필 분석 중...",
      tl: "Sinusuri ang iyong profile..."
    },
    tryAgain: {
      en: "Try again",
      es: "Intentar de nuevo",
      fr: "Réessayer",
      pt: "Tentar novamente",
      zh: "重试",
      vi: "Thử lại",
      ko: "다시 시도",
      tl: "Subukan muli"
    },
    noRecommendations: {
      en: "No additional recommendations right now",
      es: "Sin recomendaciones adicionales por ahora",
      fr: "Aucune recommandation supplémentaire pour le moment",
      pt: "Sem recomendações adicionais no momento",
      zh: "目前没有其他推荐",
      vi: "Không có đề xuất bổ sung lúc này",
      ko: "현재 추가 추천 없음",
      tl: "Walang karagdagang rekomendasyon sa ngayon"
    },
    confirmComplete: {
      en: "Are you sure you want to mark this task as complete?",
      es: "¿Está seguro de que desea marcar esta tarea como completada?",
      fr: "Êtes-vous sûr de vouloir marquer cette tâche comme terminée?",
      pt: "Tem certeza de que deseja marcar esta tarefa como concluída?",
      zh: "您确定要将此任务标记为完成吗？",
      vi: "Bạn có chắc muốn đánh dấu nhiệm vụ này là hoàn thành?",
      ko: "이 작업을 완료로 표시하시겠습니까?",
      tl: "Sigurado ka bang gusto mong markahan ang gawaing ito bilang kumpleto?"
    },
    translationMissing: {
      en: "(Translation pending)",
      es: "(Traducción pendiente)",
      fr: "(Traduction en attente)",
      pt: "(Tradução pendente)",
      zh: "(翻译待定)",
      vi: "(Đang chờ dịch)",
      ko: "(번역 대기 중)",
      tl: "(Naghihintay ng pagsasalin)"
    }
  }
};

// Helper function to get translation
export function getTranslation(category, key, language = DEFAULT_LANGUAGE) {
  const categoryTranslations = translations[category];
  if (!categoryTranslations) {
    console.warn(`Translation category not found: ${category}`);
    return key;
  }
  
  const keyTranslations = categoryTranslations[key];
  if (!keyTranslations) {
    console.warn(`Translation key not found: ${category}.${key}`);
    return key;
  }
  
  // Return requested language or fall back to English
  return keyTranslations[language] || keyTranslations[DEFAULT_LANGUAGE] || key;
}

// Get language name by code
export function getLanguageName(code) {
  const lang = SUPPORTED_LANGUAGES.find(l => l.code === code);
  return lang ? lang.name : code;
}

// Get native language name by code
export function getLanguageNativeName(code) {
  const lang = SUPPORTED_LANGUAGES.find(l => l.code === code);
  return lang ? lang.nativeName : code;
}

// Check if a language is supported
export function isLanguageSupported(code) {
  return SUPPORTED_LANGUAGES.some(l => l.code === code);
}
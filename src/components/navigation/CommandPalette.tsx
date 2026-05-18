import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  CornerDownLeft, 
  Sparkles, 
  PlusCircle, 
  ArrowRightLeft, 
  ClipboardList, 
  Users, 
  Package, 
  BarChart3, 
  Settings, 
  LayoutDashboard,
  GitFork
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CommandItem {
  id: string;
  category: 'Navegación' | 'Acciones Rápidas' | 'Búsqueda de Datos';
  title: string;
  subtitle?: string;
  icon: React.ComponentType<any>;
  shortcut?: string;
  action: () => void;
}

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Lista de comandos disponibles
  const commands: CommandItem[] = [
    // 1. NAVEGACIÓN
    {
      id: 'nav-dashboard',
      category: 'Navegación',
      title: 'Ir a Dashboard',
      subtitle: 'Vista consolidada del negocio',
      icon: LayoutDashboard,
      shortcut: 'G + D',
      action: () => { navigate('/app'); onClose(); }
    },
    {
      id: 'nav-pos',
      category: 'Navegación',
      title: 'Ir a Terminal POS',
      subtitle: 'Punto de venta y facturación',
      icon: CornerDownLeft,
      shortcut: 'G + P',
      action: () => { navigate('/app/pos'); onClose(); }
    },
    {
      id: 'nav-inventory',
      category: 'Navegación',
      title: 'Ir a Inventario',
      subtitle: 'Lotes, vencimientos y SKUs',
      icon: Package,
      shortcut: 'G + I',
      action: () => { navigate('/app/inventory'); onClose(); }
    },
    {
      id: 'nav-customers',
      category: 'Navegación',
      title: 'Ir a Clientes (CRM)',
      subtitle: 'Directorio y programa de lealtad',
      icon: Users,
      shortcut: 'G + C',
      action: () => { navigate('/app/customers'); onClose(); }
    },
    {
      id: 'nav-reports',
      category: 'Navegación',
      title: 'Ir a Reportes & Analítica',
      subtitle: 'Consultas en tiempo real',
      icon: BarChart3,
      shortcut: 'G + R',
      action: () => { navigate('/app/reports'); onClose(); }
    },
    {
      id: 'nav-branches',
      category: 'Navegación',
      title: 'Ir a Red de Sucursales',
      subtitle: 'Monitoreo corporativo',
      icon: GitFork,
      shortcut: 'G + S',
      action: () => { navigate('/app/branches'); onClose(); }
    },
    {
      id: 'nav-settings',
      category: 'Navegación',
      title: 'Ir a Configuración',
      subtitle: 'Usuarios, hardware y facturación',
      icon: Settings,
      shortcut: 'G + O',
      action: () => { navigate('/app/settings'); onClose(); }
    },

    // 2. ACCIONES RÁPIDAS
    {
      id: 'act-new-customer',
      category: 'Acciones Rápidas',
      title: 'Agregar Nuevo Cliente',
      subtitle: 'Dar de alta un nuevo paciente en el CRM',
      icon: PlusCircle,
      shortcut: 'N + C',
      action: () => { 
        navigate('/app/customers');
        setTimeout(() => {
          // Disparar clic simulado en el botón nuevo de clientes si es posible
          const btn = document.querySelector('[data-new-customer]');
          if (btn instanceof HTMLElement) btn.click();
          else alert('Módulo de Clientes: Haz clic en "+ Nuevo Cliente" en el CRM');
        }, 100);
        onClose();
      }
    },
    {
      id: 'act-deposit',
      category: 'Acciones Rápidas',
      title: 'Registrar Ingreso de Efectivo',
      subtitle: 'Entrada de caja auxiliar para cambio',
      icon: ArrowRightLeft,
      shortcut: 'C + I',
      action: () => { 
        alert('Ingreso de Efectivo: Registrando depósito de C$500 NIO para cambio...'); 
        onClose(); 
      }
    },
    {
      id: 'act-purchase-order',
      category: 'Acciones Rápidas',
      title: 'Generar Orden de Compra',
      subtitle: 'Abastecer productos con stock crítico',
      icon: ClipboardList,
      shortcut: 'N + O',
      action: () => { 
        alert('Simulador: Creando orden de compra corporativa sugerida por FEFO...'); 
        onClose(); 
      }
    },

    // 3. BÚSQUEDA DE DATOS
    {
      id: 'data-patient-hersan',
      category: 'Búsqueda de Datos',
      title: 'Paciente: Hernández, Hersan',
      subtitle: 'RUC: 129-038-1029 • Tel: 8877-6655',
      icon: Users,
      action: () => { navigate('/app/customers'); onClose(); }
    },
    {
      id: 'data-patient-maria',
      category: 'Búsqueda de Datos',
      title: 'Paciente: Castillo, Maria',
      subtitle: 'Fidelizado • Plan Oro Lealtad',
      icon: Users,
      action: () => { navigate('/app/customers'); onClose(); }
    },
    {
      id: 'data-sku-paracetamol',
      category: 'Búsqueda de Datos',
      title: 'Paracetamol 500mg • SKU-MED-042',
      subtitle: 'Lotes FEFO activos en Sucursal Centro',
      icon: Sparkles,
      action: () => { navigate('/app/inventory'); onClose(); }
    },
    {
      id: 'data-sku-amoxi',
      category: 'Búsqueda de Datos',
      title: 'Amoxicilina 250mg/5ml • SKU-MED-019',
      subtitle: 'Abasto Crítico en red de sucursales',
      icon: Sparkles,
      action: () => { navigate('/app/inventory'); onClose(); }
    },
    {
      id: 'data-sku-aspirina',
      category: 'Búsqueda de Datos',
      title: 'Aspirina 100mg • SKU-MED-003',
      subtitle: 'Medicamento controlado',
      icon: Sparkles,
      action: () => { navigate('/app/inventory'); onClose(); }
    }
  ];

  // Filtrar comandos en base a la búsqueda del usuario
  const filteredCommands = commands.filter(cmd => 
    cmd.title.toLowerCase().includes(search.toLowerCase()) || 
    cmd.category.toLowerCase().includes(search.toLowerCase()) ||
    (cmd.subtitle && cmd.subtitle.toLowerCase().includes(search.toLowerCase()))
  );

  // Reiniciar el índice seleccionado cuando cambia la búsqueda
  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  // Enfocar el input numérico/texto del buscador al montar
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Manejar atajo global Ctrl + K / Cmd + K
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Evitar abrir si hay cajas de auditoría u otros overlays de alta prioridad activos
      if (e.key === 'k' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (isOpen) onClose();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isOpen, onClose]);

  // Manejo de teclas dentro del Omnibar
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  // Auto-scrollear la lista para mantener visible el ítem activo
  useEffect(() => {
    const activeEl = containerRef.current?.querySelector('[data-active="true"]');
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  // Agrupar los comandos filtrados por categoría
  const categoriesMap = filteredCommands.reduce<Record<string, CommandItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  // Conseguir el índice absoluto plano del ítem de la categoría para vincular el hover de flechas
  let absoluteCounter = 0;

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto flex items-start justify-center pt-[12vh] p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Barra de búsqueda superior */}
        <div className="relative border-b border-slate-100 flex items-center px-5 py-4 shrink-0 bg-slate-50/50">
          <Search className="w-5 h-5 text-slate-400 mr-3" />
          <input 
            ref={inputRef}
            type="text"
            placeholder="Buscar productos, clientes o acciones en Zefiro..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent border-none text-slate-800 text-sm font-semibold outline-none placeholder-slate-400"
          />
          <div className="flex items-center gap-1.5 ml-2">
            <span className="px-1.5 py-0.5 bg-slate-200 text-slate-500 rounded text-[9px] font-black uppercase tracking-wider shadow-sm border border-slate-300/30">ESC</span>
            <span className="text-[10px] text-slate-400 font-bold">cerrar</span>
          </div>
        </div>

        {/* Listado de resultados */}
        <div 
          ref={containerRef}
          className="flex-1 overflow-y-auto p-3.5 space-y-4"
        >
          {filteredCommands.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 mb-3 animate-pulse">
                <Search className="w-5 h-5" />
              </div>
              <h5 className="text-xs font-extrabold text-slate-700">Sin resultados</h5>
              <p className="text-[10px] text-slate-400 font-semibold mt-1">No se encontró ningún comando o dato que coincida con "{search}"</p>
            </div>
          ) : (
            Object.entries(categoriesMap).map(([catName, items]) => (
              <div key={catName} className="space-y-1">
                <h4 className="text-[9px] font-black uppercase tracking-wider text-slate-400 px-2.5 py-1.5">{catName}</h4>
                <div className="space-y-0.5">
                  {items.map(item => {
                    const currentAbsIndex = absoluteCounter;
                    const isActive = selectedIndex === currentAbsIndex;
                    absoluteCounter++; // Incrementar para el mapeo plano de index

                    const IconComp = item.icon;

                    return (
                      <div
                        key={item.id}
                        data-active={isActive}
                        onClick={item.action}
                        onMouseEnter={() => setSelectedIndex(currentAbsIndex)}
                        className={cn(
                          "flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all border-l-4",
                          isActive 
                            ? "bg-indigo-50/70 border-indigo-600 text-indigo-950 font-semibold" 
                            : "border-transparent hover:bg-slate-50 text-slate-600 hover:text-slate-900"
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 transition-colors",
                            isActive 
                              ? "bg-white border-indigo-200 text-indigo-600 shadow-sm" 
                              : "bg-slate-50 border-slate-200 text-slate-400"
                          )}>
                            <IconComp className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 text-left">
                            <p className="text-xs font-extrabold leading-tight">{item.title}</p>
                            {item.subtitle && <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">{item.subtitle}</p>}
                          </div>
                        </div>

                        {/* Atajos o Indicadores */}
                        <div className="flex items-center gap-2 shrink-0">
                          {item.shortcut && (
                            <span className={cn(
                              "px-2 py-0.5 rounded text-[8px] font-black tracking-wider uppercase border",
                              isActive 
                                ? "bg-white text-indigo-700 border-indigo-200" 
                                : "bg-slate-100 text-slate-400 border-slate-200"
                            )}>
                              {item.shortcut}
                            </span>
                          )}
                          {isActive && (
                            <CornerDownLeft className="w-3.5 h-3.5 text-indigo-500 animate-pulse mr-1" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer del Omnibar */}
        <div className="shrink-0 bg-slate-50 border-t border-slate-100 px-5 py-3 flex items-center justify-between text-[10px] text-slate-400 font-semibold">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 bg-white border border-slate-200 rounded shadow-inner text-[8px]">↑↓</span> Navegar
            </span>
            <span className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 bg-white border border-slate-200 rounded shadow-inner text-[8px]">Enter</span> Ejecutar
            </span>
          </div>
          <div>
            Zefiro Global Search • <span className="font-extrabold text-indigo-600">Omnibar</span>
          </div>
        </div>
      </div>
    </div>
  );
}

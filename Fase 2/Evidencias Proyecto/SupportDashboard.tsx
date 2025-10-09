// src/components/dashboard/SupportDashboard.tsx
"use client";

import { useState, useMemo, useEffect } from "react";
// import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from "recharts";
import { useAuth } from "@/hooks/useAuth";
import { useTicketsSupport, SupportTicket } from "@/hooks/useTicketsSupport";
import { useTicketResponses } from "@/hooks/useTicketResponses";
import { useNotifications } from "@/hooks/useNotifications";
import { useToast } from "@/components/ui/Toast";
import { useDebug, useDebugError } from "@/hooks/useDebug";
// Import optimizado de iconos
import { 
  MessageSquare, 
  Send, 
  User, 
  Clock, 
  Paperclip,
  Eye,
  X
} from "lucide-react";
import Image from "next/image"; 

export default function SupportDashboard() {
  const { logout, loading: authLoading } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { tickets, loading, updateTicketStatus } = useTicketsSupport();

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
    } catch (error) {
      console.error('Error en logout:', error);
      setIsLoggingOut(false);
    }
  };
  const { addToast, ToastContainer } = useToast();
  const { notifyUserOfResponse, notifyUserOfStatusChange } = useNotifications();

  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  
  // Auto-seleccionar el primer ticket cuando se cargan los tickets
  useEffect(() => {
    if (tickets.length > 0 && !selectedTicketId) {
      setSelectedTicketId(tickets[0].id);
    }
  }, [tickets, selectedTicketId]);
  const [processing, setProcessing] = useState(false);
  const [showImageModal, setShowImageModal] = useState<string | null>(null);

  // Hook para respuestas del ticket seleccionado
  const { 
    responses, 
    loading: responsesLoading, 
    addResponse,
    error: responsesError
  } = useTicketResponses(selectedTicketId);

  const selectedTicket = useMemo<SupportTicket | null>(
    () => tickets.find((t) => t.id === selectedTicketId) ?? null,
    [tickets, selectedTicketId]
  );

  // Debug hooks
  useDebug('SupportDashboard', { 
    selectedTicketId, 
    ticketsCount: tickets.length, 
    responsesCount: responses.length,
    loading,
    responsesLoading 
  });
  useDebugError('SupportDashboard', responsesError);

  const ticketStats = useMemo(() => {
    const stats = [
      { name: "En espera", value: tickets.filter((t) => t.status === "pending").length },
      { name: "En curso", value: tickets.filter((t) => t.status === "in_progress").length },
      { name: "Resuelto", value: tickets.filter((t) => t.status === "resolved").length },
    ];
    return stats;
  }, [tickets]);

  // Datos del gráfico con colores y cantidades
  const chartData = useMemo(() => {
    const COLORS = ["#f59e0b", "#3b82f6", "#10b981"];
    return ticketStats.map((stat, index) => ({
      name: stat.name,
      value: stat.value,
      color: COLORS[index % COLORS.length]
    }));
  }, [ticketStats]);

  // 🔹 Manejo de cambio de estado con manejo de errores explícito 🔹
  const handleChangeStatus = async (status: "pending" | "in_progress" | "resolved") => {
    if (!selectedTicket) {
      console.error("❌ SupportDashboard - No hay ticket seleccionado");
      return;
    }
    
    setProcessing(true);
    try {
      console.log("➡️ SupportDashboard - Intentando actualizar ticket:", {
        ticketId: selectedTicket.id,
        currentStatus: selectedTicket.status,
        newStatus: status
      });
      
      const result = await updateTicketStatus(selectedTicket.id, status);
      
      
      // Comprobación de error devuelto por el hook
      if (result.error) {
        console.error("❌ SupportDashboard - Error en result:", result.error);
        throw result.error; 
      }
      
      setSelectedTicketId(selectedTicket.id);
      
      // Notificación de éxito
      const statusText = status === "pending" ? "Pendiente" : 
                        status === "in_progress" ? "En curso" : "Resuelto";
      
      addToast({
        type: 'success',
        title: 'Estado actualizado',
        message: `El ticket ha sido marcado como ${statusText.toLowerCase()}`,
        duration: 4000
      });

      // Notificar al usuario del cambio de estado
      if (selectedTicket.created_by) {
        console.log("📧 SupportDashboard - Notificando al usuario del cambio");
        await notifyUserOfStatusChange(selectedTicket.id, selectedTicket.created_by, statusText);
      }
      
    } catch (err: unknown) {
      console.error("🚨 SupportDashboard - Error completo:", err);
      console.error("🚨 SupportDashboard - Error type:", typeof err);
      console.error("🚨 SupportDashboard - Error constructor:", err?.constructor?.name);
      
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'Error desconocido al actualizar el ticket.';
        
      console.error("🚨 SupportDashboard - Error message final:", errorMessage);
      
      addToast({
        type: 'error',
        title: 'Error al actualizar',
        message: `No se pudo cambiar el estado del ticket: ${errorMessage}`,
        duration: 6000
      });
    } finally {
      setProcessing(false);
    }
  };

  // 🆕 Manejo de respuestas
  const [responseMessage, setResponseMessage] = useState('');
  const [responseImage, setResponseImage] = useState<File | null>(null);
  const [responseImagePreview, setResponseImagePreview] = useState<string | null>(null);
  const [isSubmittingResponse, setIsSubmittingResponse] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setResponseImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setResponseImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeResponseImage = () => {
    setResponseImage(null);
    setResponseImagePreview(null);
  };

  const handleSubmitResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!responseMessage.trim()) {
      addToast({
        type: 'warning',
        title: 'Mensaje requerido',
        message: 'Por favor, escribe un mensaje antes de enviar la respuesta',
        duration: 4000
      });
      return;
    }

    setIsSubmittingResponse(true);
    
    const timeoutId = setTimeout(() => {
      console.error('⏰ TIMEOUT: addResponse tardó más de 30 segundos');
      setIsSubmittingResponse(false);
      addToast({
        type: 'error',
        title: 'Timeout',
        message: 'La operación tardó demasiado. Inténtalo de nuevo.',
        duration: 6000
      });
    }, 30000);
    
    try {
      const result = await addResponse(responseMessage, responseImage || undefined);
      
      if (result.error) {
        console.error('❌ SupportDashboard: Error en result:', result.error);
        throw result.error;
      }

      setResponseMessage('');
      setResponseImage(null);
      setResponseImagePreview(null);
      
      addToast({
        type: 'success',
        title: 'Respuesta enviada',
        message: 'Tu respuesta ha sido enviada correctamente al usuario',
        duration: 5000
      });

      if (selectedTicket?.created_by) {
        await notifyUserOfResponse(selectedTicket.id, selectedTicket.created_by, responseMessage);
      }
      
    } catch (error) {
      console.error('Error enviando respuesta:', error);
      
      addToast({
        type: 'error',
        title: 'Error al enviar',
        message: 'No se pudo enviar la respuesta. Inténtalo de nuevo',
        duration: 6000
      });
    } finally {
      clearTimeout(timeoutId);
      setIsSubmittingResponse(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 🌟 HEADER AÑADIDO CON BOTÓN DE LOGOUT 🌟 */}
      <header className="bg-white shadow dark:bg-gray-800">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Panel de Soporte</h1>
          <button
            onClick={handleLogout}
            disabled={isLoggingOut || authLoading}
            className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoggingOut ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Cerrando...
              </>
            ) : (
              'Cerrar Sesión'
            )}
          </button>
        </div>
      </header>
      {/* 🌟 FIN DEL HEADER AÑADIDO 🌟 */}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Estadísticas */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Estado de Tickets</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {ticketStats.map((stat, index) => (
              <div key={stat.name} className="text-center p-4 rounded-lg bg-gray-50 dark:bg-gray-700">
                <div 
                  className="w-16 h-16 mx-auto mb-2 rounded-full flex items-center justify-center text-white text-2xl font-bold"
                  style={{ backgroundColor: chartData[index]?.color || '#3b82f6' }}
                >
                  {stat.value}
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white">{stat.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{stat.value} tickets</p>
              </div>
            ))}
          </div>
        </div>

        {/* Lista y detalle */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Lista */}
          <aside className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 md:col-span-1">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Tickets ({tickets.length})</h2>

            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
                <p className="text-sm text-gray-500 mt-2">Cargando tickets...</p>
              </div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">No hay tickets disponibles</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {tickets.map((ticket, index) => {
                  const tags = Array.isArray(ticket.tags)
                    ? ticket.tags
                    : ticket.tags
                    ? String(ticket.tags).split(",").map((s) => s.trim())
                    : [];

                  const isUrgent = ticket.is_urgent === true; 

                  return (
                    <li
                      key={ticket.id}
                      onClick={() => setSelectedTicketId(ticket.id)}
                      className={`p-3 rounded-lg border cursor-pointer transition ${
                        selectedTicketId === ticket.id
                          ? "bg-blue-50 dark:bg-blue-900"
                          : "hover:bg-gray-50 dark:hover:bg-gray-700"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">Ticket {index + 1}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {(ticket.description?.length ?? 0) > 60
                              ? `${ticket.description.substring(0, 60)}...`
                              : ticket.description}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {tags.slice(0, 4).map((tag: string) => (
                              <span
                                key={tag}
                                className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-800 dark:text-gray-200"
                              >
                                {tag}
                              </span>
                            ))}
                            {isUrgent && (
                              <span className="text-xs px-2 py-0.5 bg-red-100 text-red-800 rounded-full">
                                ⚠️ Urgente
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                              ticket.status === "pending"
                                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                                : ticket.status === "in_progress"
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                                : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                            }`}
                          >
                            {ticket.status === "pending"
                              ? "Pendiente"
                              : ticket.status === "in_progress"
                              ? "En curso"
                              : "Resuelto"}
                          </span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </aside>

          {/* Detalle */}
          <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 md:col-span-2">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Detalle del Ticket</h2>

            {!selectedTicket ? (
              <p className="text-gray-500 dark:text-gray-400">
                Selecciona un ticket de la lista para ver más información.
              </p>
            ) : (
              <div className="space-y-6">
                {/* Información del ticket */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Ticket #{tickets.findIndex((t) => t.id === selectedTicket.id) + 1}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Creado por: {selectedTicket.users?.full_name || 'Usuario'}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Email: {selectedTicket.users?.email}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        selectedTicket.status === "pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : selectedTicket.status === "in_progress"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {selectedTicket.status === "pending"
                        ? "Pendiente"
                        : selectedTicket.status === "in_progress"
                        ? "En curso"
                        : "Resuelto"}
                    </span>
                  </div>

                  <div className="mb-4">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">Descripción:</h4>
                    <p className="text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 p-3 rounded border">
                      {selectedTicket.description}
                    </p>
                  </div>

                  {/* Etiquetas */}
                  {selectedTicket.tags && selectedTicket.tags.length > 0 && (
                    <div className="mb-4">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2">Etiquetas:</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedTicket.tags.map((tag: string) => (
                          <span
                            key={tag}
                            className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-sm"
                          >
                            {tag}
                          </span>
                        ))}
                        {selectedTicket.is_urgent && (
                          <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                            ⚠️ Urgente
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Imagen adjunta del ticket original */}
                  {selectedTicket.image_url && (
                    <div className="mb-4">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2">Imagen adjunta:</h4>
                      <div className="relative inline-block">
                        <Image
                          src={selectedTicket.image_url}
                          alt="Imagen del ticket"
                          width={200}
                          height={150}
                          className="rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setShowImageModal(selectedTicket.image_url!)}
                        />
                        <button
                          onClick={() => setShowImageModal(selectedTicket.image_url!)}
                          className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full hover:bg-black/70 transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Botones de estado */}
                  <div className="flex gap-3">
                    {selectedTicket.status !== "in_progress" && (
                      <button
                        onClick={() => handleChangeStatus("in_progress")}
                        disabled={processing}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2"
                      >
                        {processing ? "Procesando..." : "Marcar En curso"}
                      </button>
                    )}
                    {selectedTicket.status !== "resolved" && (
                      <button
                        onClick={() => handleChangeStatus("resolved")}
                        disabled={processing}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-60 flex items-center gap-2"
                      >
                        {processing ? "Procesando..." : "✅ Completar Ticket"}
                      </button>
                    )}
                  </div>
                </div>

                {/* Sección de respuestas */}
                <div className="border-t border-gray-200 dark:border-gray-600 pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Conversación ({responses.length} respuestas)
                  </h3>

                  {/* Lista de respuestas */}
                  <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
                    {responsesError ? (
                      <div className="text-center py-4">
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                          <p className="text-sm text-red-600 dark:text-red-400">
                            Error al cargar respuestas: {responsesError}
                          </p>
                          <button
                            onClick={() => window.location.reload()}
                            className="mt-2 text-xs text-red-500 hover:text-red-700 underline"
                          >
                            Recargar página
                          </button>
                        </div>
                      </div>
                    ) : responsesLoading ? (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto" />
                        <p className="text-sm text-gray-500 mt-2">Cargando respuestas...</p>
                      </div>
                    ) : responses.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                          <MessageSquare className="h-8 w-8 text-gray-400" />
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">
                          No hay respuestas aún
                        </p>
                        <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
                          Sé el primero en responder a este ticket
                        </p>
                      </div>
                    ) : (
                      responses.map((response) => (
                        <div
                          key={response.id}
                          className={`p-4 rounded-lg border ${
                            response.is_support_response
                              ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                              : "bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600"
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-gray-500" />
                              <span className="font-medium text-gray-900 dark:text-white">
                                {response.users?.full_name || 'Usuario'}
                              </span>
                              {response.is_support_response && (
                                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-xs">
                                  Soporte
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <Clock className="h-4 w-4" />
                              {new Date(response.created_at).toLocaleString()}
                            </div>
                          </div>
                          
                          <p className="text-gray-700 dark:text-gray-300 mb-3">
                            {response.message}
                          </p>

                          {/* Imagen de respuesta */}
                          {response.image_url && (
                            <div className="mt-3">
                              <div className="relative inline-block">
                                <Image
                                  src={response.image_url}
                                  alt="Imagen de respuesta"
                                  width={150}
                                  height={100}
                                  className="rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer hover:opacity-80 transition-opacity"
                                  onClick={() => setShowImageModal(response.image_url!)}
                                />
                                <button
                                  onClick={() => setShowImageModal(response.image_url!)}
                                  className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded-full hover:bg-black/70 transition-colors"
                                >
                                  <Eye className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  {/* Formulario de respuesta */}
                  <form onSubmit={handleSubmitResponse} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">Responder al ticket:</h4>
                    
                    <div className="mb-4">
                      <textarea
                        value={responseMessage}
                        onChange={(e) => setResponseMessage(e.target.value)}
                        placeholder="Escribe tu respuesta..."
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        required
                      />
                    </div>

                    {/* Adjuntar imagen */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        <Paperclip className="inline h-4 w-4 mr-2" />
                        Adjuntar imagen (opcional)
                      </label>
                      
                      {!responseImage ? (
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 dark:file:bg-blue-900/30 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50"
                        />
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {responseImage.name}
                            </span>
                            <button
                              type="button"
                              onClick={removeResponseImage}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                          {responseImagePreview && (
                            <Image
                              src={responseImagePreview}
                              alt="Preview"
                              width={100}
                              height={75}
                              className="rounded-lg border border-gray-200 dark:border-gray-600"
                            />
                          )}
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmittingResponse || !responseMessage.trim()}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                    >
                      {isSubmittingResponse ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Enviando...</span>
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          <span>Enviar Respuesta</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Modal para ver imágenes en tamaño completo */}
      {showImageModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={() => setShowImageModal(null)}
              className="absolute -top-4 -right-4 bg-white text-black rounded-full p-2 hover:bg-gray-100 transition-colors z-10"
            >
              <X className="h-6 w-6" />
            </button>
            <Image
              src={showImageModal}
              alt="Imagen ampliada"
              width={800}
              height={600}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>
        </div>
      )}
      
      {/* Toast Notifications */}
      <ToastContainer />
    </div>
  );
}
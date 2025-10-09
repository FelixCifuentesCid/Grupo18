'use client';

import { useAuth } from '@/hooks/useAuth';
import { useTickets } from '@/hooks/useTickets';
import TicketHistory from './TicketHistory';
import { 
  LogOut, 
  User, 
  Ticket, 
  AlertCircle, 
  Tag, 
  ChevronDown, 
  X, 
  FileText, 
  Send 
} from 'lucide-react';
import { useState } from 'react';
import Image from 'next/image';
import { useToast } from '@/components/ui/Toast';

export default function Dashboard() {
  const { user, logout, loading: authLoading } = useAuth();
  const { 
    createTicket, 
    uploadImage, 
    clearError,
    tickets: userTickets
  } = useTickets();
  const { addToast, ToastContainer } = useToast();
  
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
    } catch (error) {
      console.error('❌ Dashboard: Error en logout:', error);
      setIsLoggingOut(false);
    }
  };

  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTicketForHistory, setSelectedTicketForHistory] = useState<string | null>(null);

  // Etiquetas disponibles
  const availableTags = [
    'Impresora', 'Consulta Técnica', 'Recepción', 'Huesped', 
    'Sin WiFi', 'No Proyecta', 'Solicitud de Adaptador', 
    'Sin Internet', 'Cocina', 'Problemas con Notebook', 'Problemas POG'
  ];

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev => {
      if (prev.includes(tag)) {
        return prev.filter(t => t !== tag);
      } else {
        return [...prev, tag];
      }
    });
  };

  const removeTag = (tagToRemove: string) => {
    setSelectedTags(prev => prev.filter(tag => tag !== tagToRemove));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Limpiar errores previos
    setError(null);
    clearError();
    
    if (!description.trim()) {
      setError('Por favor, describe el problema');
      return;
    }

    if (selectedTags.length === 0) {
      setError('Por favor, selecciona al menos una etiqueta');
      return;
    }

    if (!user) {
      setError('Usuario no autenticado');
      return;
    }

    setIsSubmitting(true);

    try {
      let imageUrl = null;
      
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
        if (!imageUrl) {
          setError('Error al subir la imagen');
          return;
        }
      }

      
      const { error } = await createTicket({
        description: description.trim(),
        tags: selectedTags,
        is_urgent: isUrgent,
        image_url: imageUrl || undefined,
        created_by: user.id,
      });

      if (error) {
        throw error;
      }

      setDescription('');
      setSelectedTags([]);
      setIsUrgent(false);
      setImageFile(null);
      setImagePreview(null);

      addToast({
        type: 'success',
        title: '¡Ticket enviado!',
        message: 'Tu solicitud ha sido enviada correctamente. Te contactaremos pronto.',
        duration: 5000
      });
    } catch (error: unknown) {
      console.error('💥 Error completo:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error inesperado al enviar el ticket';
      setError(errorMessage);
      
      // Mostrar notificación de error
      addToast({
        type: 'error',
        title: 'Error al enviar ticket',
        message: errorMessage,
        duration: 6000
      });
    } finally {
      console.log('🔚 Finalizando proceso...');
      setIsSubmitting(false);
    }
  };

  // const handleLogout = async () => {
  //   // Simulación de logout - reemplazar con tu lógica
  //   console.log('🚪 Logout simulado');
  //   alert('Logout simulado - Supabase eliminado');
  // };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                    <Ticket className="w-5 h-5 text-white" />
                  </div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                    TicketFast
                  </h1>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="hidden md:block">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {user?.full_name || user?.email}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {user?.role || 'Usuario'}
                  </p>
                </div>
              </div>
              
              <button
                onClick={handleLogout}
                disabled={isLoggingOut || authLoading}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoggingOut ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500 mr-2"></div>
                    Cerrando...
                  </>
                ) : (
                  <>
                    <LogOut className="w-4 h-4 mr-2" />
                    Cerrar Sesión
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          {/* Welcome Section */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              ¡Bienvenido, {user?.full_name || user?.email || 'Usuario'}!
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Crea un nuevo ticket para solicitar soporte técnico
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-sm text-red-600 dark:text-red-400">
                ❌ {error}
              </p>
            </div>
          )}

          {/* Ticket Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Description and Tags Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Tags - Takes 1/3 of the space (LEFT) */}
              <div className="lg:col-span-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Tag className="inline h-4 w-4 mr-2" />
                  Selecciona etiquetas
                </label>
                
                {/* Custom Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowTagDropdown(!showTagDropdown)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors flex items-center justify-between"
                  >
                    <span className={selectedTags.length === 0 ? 'text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'}>
                      {selectedTags.length === 0 ? 'Seleccionar etiquetas...' : `${selectedTags.length} seleccionadas`}
                    </span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${showTagDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown Menu */}
                  {showTagDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {availableTags.map((tag) => (
                        <label
                          key={tag}
                          className="flex items-center px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedTags.includes(tag)}
                            onChange={() => handleTagToggle(tag)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-3"
                          />
                          <span className="text-sm text-gray-900 dark:text-white">{tag}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selected Tags Display */}
                {selectedTags.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Etiquetas seleccionadas:</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedTags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            title={`Eliminar etiqueta ${tag}`}
                            className="ml-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}



              </div>

              {/* Description - Takes 2/3 of the space (RIGHT) */}
              <div className="lg:col-span-2">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <FileText className="inline h-4 w-4 mr-2" />
                  Describe el problema
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={6}
                  placeholder="Explica detalladamente qué problema estás experimentando..."
                  className="block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
                  required
                />

                {/* Image Upload and Urgency Row */}
                <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Image Upload - Columna izquierda (2/3 del espacio) */}
                  <div className="lg:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <FileText className="inline h-4 w-4 mr-2" />
                      Adjuntar imagen (opcional)
                    </label>
                    
                    {!imageFile ? (
                      /* Input de archivo - solo cuando no hay archivo seleccionado */
                      <div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 dark:file:bg-blue-900/30 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50"
                        />
                      </div>
                    ) : (
                      /* Preview de imagen - solo cuando hay archivo seleccionado */
                      <div className="space-y-2">
                        {/* Nombre del archivo con botón X superpuesto */}
                        <div className="relative inline-block">
                          <div className="bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2 pr-8">
                            <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                              {imageFile.name}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={removeImage}
                            title="Eliminar imagen"
                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors shadow-lg"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                        
                        {/* Preview de la imagen */}
                        {imagePreview && (
                          <div className="relative">
                            <Image
                              src={imagePreview}
                              alt="Preview"
                              width={200}
                              height={150}
                              className="max-w-full h-auto max-h-48 rounded-lg border border-gray-200 dark:border-gray-600 object-cover"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Urgency Section - Columna derecha (1/3 del espacio) */}
                  <div className="lg:col-span-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <AlertCircle className="h-4 w-4 text-orange-500" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        ¿Es urgente?
                      </span>
                    </div>
                    <div className="ml-6">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={isUrgent}
                          onChange={(e) => {
                            console.log('🔘 Checkbox urgente cambiado:', e.target.checked);
                            setIsUrgent(e.target.checked);
                          }}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Marcar como prioritario
                        </span>
                      </label>
                      {isUrgent && (
                        <p className="mt-2 text-sm text-orange-600 dark:text-orange-400 font-medium">
                          ⚠️ Este ticket será marcado como prioritario
                        </p>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            </div>






            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Enviando...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5" />
                    <span>Enviar Ticket</span>
                  </>
                )}
              </button>
            </div>
          </form>


        </div>

        {/* Mis Tickets */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Mis Tickets ({userTickets.length})
            </h2>
            <button
              onClick={() => window.location.reload()}
              className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
            >
              Actualizar
            </button>
          </div>
          
          {userTickets.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                <Ticket className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">
                No tienes tickets aún
              </p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
                Crea tu primer ticket usando el formulario de arriba
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {userTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          Ticket #{ticket.id.slice(0, 8)}
                        </h3>
                        {ticket.is_urgent && (
                          <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                            ⚠️ Urgente
                          </span>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 line-clamp-2">
                        {ticket.description}
                      </p>
                      
                      {/* Etiquetas */}
                      {ticket.tags && ticket.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {ticket.tags.slice(0, 3).map((tag: string) => (
                            <span
                              key={tag}
                              className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-xs"
                            >
                              {tag}
                            </span>
                          ))}
                          {ticket.tags.length > 3 && (
                            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-xs">
                              +{ticket.tags.length - 3} más
                            </span>
                          )}
                        </div>
                      )}
                      
                      <div className="flex items-center gap-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            ticket.status === "pending"
                              ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                              : ticket.status === "in_progress"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                              : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                          }`}
                        >
                          {ticket.status === "pending" ? "Pendiente" : 
                           ticket.status === "in_progress" ? "En curso" : "Resuelto"}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(ticket.created_at).toLocaleDateString('es-ES')}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2 ml-4">
                      <button
                        onClick={() => setSelectedTicketForHistory(ticket.id)}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors"
                      >
                        Ver Historial
                      </button>
                      {ticket.image_url && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 text-center">
                          📎 Con imagen
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Historial del Ticket Seleccionado */}
        {selectedTicketForHistory && (
          <div className="mt-8">
            <TicketHistory 
              ticketId={selectedTicketForHistory}
              ticketTitle={`Ticket #${selectedTicketForHistory.slice(0, 8)}`}
            />
            <div className="mt-4 text-center">
              <button
                onClick={() => setSelectedTicketForHistory(null)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors"
              >
                Cerrar Historial
              </button>
            </div>
          </div>
        )}
      </main>
      
      {/* Toast Notifications */}
      <ToastContainer />
    </div>
  );
}

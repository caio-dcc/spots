"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Footer } from "@/components/Footer";
import { RefundModal } from "@/components/client/RefundModal";
import { ReportProblemModal } from "@/components/client/ReportProblemModal";
import { toast } from "sonner";
import {
  Package,
  Check,
  Clock,
  RotateCcw,
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
  Download,
} from "lucide-react";
import QRCode from "qrcode";

interface Order {
  id: string;
  event_id: string;
  buyer_name: string;
  buyer_email: string;
  quantity: number;
  total_amount: number;
  unit_price: number;
  status: "pending" | "paid" | "checked_in" | "refunded" | "cancelled";
  ticket_code: string;
  qr_code: string;
  created_at: string;
  checked_in_at?: string;
  refunded_at?: string;
  paid_at?: string;
}

interface Event {
  id: string;
  title: string;
  event_date: string;
  description?: string;
  thumbnail_url?: string;
}

import { motion } from "framer-motion";

export default function MeusPedidosPage() {
  const [orders, setOrders] = useState<(Order & { event?: Event })[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string>("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
    fetchOrders();
  }, []);

  const checkAuth = async () => {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        router.push("/login");
        return;
      }

      setUserEmail(user.email || "");
    } catch (err) {
      console.error("Erro ao verificar autenticação:", err);
      router.push("/login");
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);

      // Buscar usuário atual
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Buscar pedidos do usuário
      const { data: ordersData, error: ordersError } = await supabase
        .from("ticket_orders")
        .select("*")
        .eq("buyer_email", user.email)
        .order("created_at", { ascending: false });

      if (ordersError) throw ordersError;

      // Para cada pedido, buscar informações do evento
      const ordersWithEvents = await Promise.all(
        (ordersData || []).map(async (order) => {
          const { data: eventData } = await supabase
            .from("events")
            .select("id, title, event_date, description, thumbnail_url")
            .eq("id", order.event_id)
            .single();

          return {
            ...order,
            event: eventData || undefined,
          };
        })
      );

      setOrders(ordersWithEvents);
    } catch (err) {
      console.error("Erro ao buscar pedidos:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefundClick = (order: Order) => {
    setSelectedOrder(order);
    setShowRefundModal(true);
  };

  const handleReportClick = (order: Order) => {
    setSelectedOrder(order);
    setShowReportModal(true);
  };

  const handleDownloadQR = async (order: Order) => {
    try {
      const dataUrl = await QRCode.toDataURL(order.qr_code, {
        width: 512,
        color: { dark: "#18181b", light: "#ffffff" },
      });
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `ingresso-${order.ticket_code}.png`;
      link.click();
      toast.success("Download iniciado!");
    } catch (err) {
      console.error("Erro ao gerar QR Code:", err);
      toast.error("Erro ao gerar QR Code para download.");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-semibold">
            <Check className="w-3 h-3" />
            Confirmado
          </div>
        );
      case "checked_in":
        return (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-semibold">
            <CheckCircle className="w-3 h-3" />
            Validado
          </div>
        );
      case "refunded":
        return (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 text-xs font-semibold">
            <RotateCcw className="w-3 h-3" />
            Reembolsado
          </div>
        );
      case "pending":
        return (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-semibold">
            <Clock className="w-3 h-3" />
            Pendente
          </div>
        );
      case "cancelled":
        return (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-semibold">
            <XCircle className="w-3 h-3" />
            Cancelado
          </div>
        );
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="flex flex-col min-h-screen">

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-40 pb-12">
        <div className="space-y-12">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 text-center max-w-2xl mx-auto"
          >
            <h1 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter">
              Meus Pedidos
            </h1>
            <p className="text-white/60 text-lg md:text-xl font-medium">
              Acompanhe seus ingressos e gerencie suas compras
            </p>
          </motion.div>

          {/* Orders List */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 p-6 h-32 animate-pulse"
                />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-20 space-y-4">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto">
                <Package className="w-8 h-8 text-white/30" />
              </div>
              <p className="text-white/70 text-lg">
                Você ainda não tem pedidos
              </p>
              <button
                onClick={() => router.push("/mosaico-eventos")}
                className="px-6 py-3 rounded-lg bg-ruby hover:bg-ruby/90 text-white font-bold transition inline-block mt-4"
              >
                Comprar Ingressos
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-xl overflow-hidden bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-sm border border-white/10 hover:border-ruby/50 transition-all"
                >
                  <div className="p-6 space-y-4">
                    {/* Header Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-bold text-white">
                          {order.event?.title || "Evento não encontrado"}
                        </h3>
                        <p className="text-sm text-white/60 mt-1">
                          Pedido: {order.ticket_code}
                        </p>
                      </div>
                      <div>{getStatusBadge(order.status)}</div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-t border-b border-white/10">
                      <div>
                        <p className="text-xs text-white/60 uppercase tracking-wide font-semibold">
                          Quantidade
                        </p>
                        <p className="text-lg font-bold text-white mt-1">
                          {order.quantity}x
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-white/60 uppercase tracking-wide font-semibold">
                          Valor Total
                        </p>
                        <p className="text-lg font-bold text-ruby mt-1">
                          R$ {Number(order.total_amount).toFixed(2)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-white/60 uppercase tracking-wide font-semibold">
                          Data do Evento
                        </p>
                        <p className="text-lg font-bold text-white mt-1">
                          {order.event?.event_date
                            ? formatDate(order.event.event_date)
                            : "-"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-white/60 uppercase tracking-wide font-semibold">
                          Data da Compra
                        </p>
                        <p className="text-lg font-bold text-white mt-1">
                          {formatDate(order.created_at)}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-4">
                      {order.status === "paid" && (
                        <>
                          <button
                            onClick={() =>
                              router.push(
                                `/e/${order.event?.id}/confirmacao?order=${order.id}`
                              )
                            }
                            className="flex items-center justify-center gap-2 flex-1 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold transition"
                          >
                            <Eye className="w-4 h-4" />
                            Ver Ingresso
                          </button>

                          <button
                            onClick={() => handleDownloadQR(order)}
                            className="flex items-center justify-center gap-2 flex-1 px-4 py-2 rounded-lg bg-ruby/20 hover:bg-ruby/30 text-ruby font-semibold transition"
                          >
                            <Download className="w-4 h-4" />
                            Baixar QR
                          </button>

                          <button
                            onClick={() => handleRefundClick(order)}
                            className="flex items-center justify-center gap-2 flex-1 px-4 py-2 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 font-semibold transition"
                          >
                            <RotateCcw className="w-4 h-4" />
                            Reembolsar
                          </button>
                        </>
                      )}

                      {order.status === "checked_in" && (
                        <div className="w-full px-4 py-2 rounded-lg bg-blue-500/20 text-blue-400 text-center font-semibold">
                          ✓ Ingresso Validado
                        </div>
                      )}

                      {order.status === "refunded" && (
                        <div className="w-full px-4 py-2 rounded-lg bg-orange-500/20 text-orange-400 text-center font-semibold">
                          Reembolso Processado
                        </div>
                      )}

                      {/* Report Problem - Available for all orders */}
                      {order.status !== "cancelled" && (
                        <button
                          onClick={() => handleReportClick(order)}
                          className="flex items-center justify-center gap-2 flex-1 px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 font-semibold transition"
                        >
                          <AlertCircle className="w-4 h-4" />
                          Reportar Problema
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      {selectedOrder && (
        <>
          <RefundModal
            order={selectedOrder}
            isOpen={showRefundModal}
            onClose={() => {
              setShowRefundModal(false);
              setSelectedOrder(null);
            }}
            onSuccess={() => {
              setShowRefundModal(false);
              setSelectedOrder(null);
              fetchOrders();
            }}
          />

          <ReportProblemModal
            order={selectedOrder}
            isOpen={showReportModal}
            onClose={() => {
              setShowReportModal(false);
              setSelectedOrder(null);
            }}
            onSuccess={() => {
              setShowReportModal(false);
              setSelectedOrder(null);
            }}
          />
        </>
      )}

      <Footer accentColor="#810B14" />
    </div>
  );
}

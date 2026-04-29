"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const APP_VERSION = "1.0.1";

export function UpdateModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const lastVersion = localStorage.getItem("app_update_version");
    if (lastVersion !== APP_VERSION) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem("app_update_version", APP_VERSION);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) handleClose();
    }}>
      <DialogContent className="sm:max-w-md font-sans">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold tracking-tight text-zinc-900">Novidades da Versão {APP_VERSION}</DialogTitle>
          <DialogDescription className="font-medium text-zinc-500">
            Confira as atualizações que acabaram de chegar no sistema:
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-3 text-sm text-zinc-600 font-medium">
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Gestão de Convidados:</strong> Agora você pode excluir convidados da lista antes de salvar.</li>
            <li><strong>Associação a Eventos:</strong> Salve sua lista de convidados diretamente em um evento.</li>
            <li><strong>Check-in Online:</strong> Nova subrota em Convidados para realizar o check-in rápido.</li>
            <li><strong>Importação de Excel:</strong> O sistema agora lê todas as abas do seu arquivo Excel automaticamente.</li>
          </ul>
        </div>
        <DialogFooter>
          <Button onClick={handleClose} className="bg-ruby hover:bg-ruby/90 text-white cursor-pointer w-full font-bold shadow-lg shadow-ruby/20">
            Entendi, aproveitar novidades!
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

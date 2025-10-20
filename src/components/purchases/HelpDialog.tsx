import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Icon from '@/components/ui/icon';
import SecretSetupCard from './SecretSetupCard';
import BitrixWebhookSetup from './BitrixWebhookSetup';
import WebhookSetupCard from './WebhookSetupCard';

interface HelpDialogProps {
  apiUrl: string;
}

export default function HelpDialog({ apiUrl }: HelpDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="rounded-full">
          <Icon name="HelpCircle" size={20} />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon name="BookOpen" size={24} />
            Инструкция по настройке интеграции
          </DialogTitle>
          <DialogDescription>
            Пошаговое руководство по подключению Битрикс24 к системе закупок
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="secrets" className="w-full mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="secrets">
              <Icon name="Lock" size={16} className="mr-2" />
              Секреты
            </TabsTrigger>
            <TabsTrigger value="bitrix">
              <Icon name="Key" size={16} className="mr-2" />
              Права Битрикс24
            </TabsTrigger>
            <TabsTrigger value="webhook">
              <Icon name="Webhook" size={16} className="mr-2" />
              Автовебхук
            </TabsTrigger>
          </TabsList>

          <TabsContent value="secrets" className="mt-4">
            <SecretSetupCard />
          </TabsContent>

          <TabsContent value="bitrix" className="mt-4">
            <BitrixWebhookSetup />
          </TabsContent>

          <TabsContent value="webhook" className="mt-4">
            <WebhookSetupCard apiUrl={apiUrl} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

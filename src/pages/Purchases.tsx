import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Icon from '@/components/ui/icon';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import CreatePurchaseTab from '@/components/purchases/CreatePurchaseTab';
import PurchasesMonitorTab from '@/components/purchases/PurchasesMonitorTab';
import WebhooksTab from '@/components/purchases/WebhooksTab';
import { Purchase, Webhook } from '@/components/purchases/types';

const API_URL = 'https://functions.poehali.dev/73ea551a-feab-4417-92c3-dd78ca56946b';
const WEBHOOK_URL = 'https://functions.poehali.dev/81376a34-1578-43f3-966a-793d36df08f1';

export default function Purchases() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loadingMonitor, setLoadingMonitor] = useState(true);

  useEffect(() => {
    fetchMonitorData();
    const interval = setInterval(fetchMonitorData, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchMonitorData = async () => {
    try {
      const [purchasesRes, webhooksRes] = await Promise.all([
        fetch(`${API_URL}?action=list_purchases`),
        fetch(`${API_URL}?action=list_webhooks`)
      ]);
      
      const purchasesData = await purchasesRes.json();
      const webhooksData = await webhooksRes.json();
      
      if (purchasesData.success) {
        setPurchases(purchasesData.purchases || []);
      }
      
      if (webhooksData.success) {
        setWebhooks(webhooksData.webhooks || []);
      }
    } catch (error) {
      console.error('Error fetching monitor data:', error);
    } finally {
      setLoadingMonitor(false);
    }
  };

  const handleShowToast = (title: string, description: string, variant?: 'default' | 'destructive') => {
    toast({
      title,
      description,
      variant,
    });
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <Icon name="ArrowLeft" size={24} />
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500 rounded-lg">
              <Icon name="ShoppingCart" size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Закупки</h1>
              <p className="text-muted-foreground">Создание закупок в ЦРМ "Обеспечение" из сделок Битрикс24</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="create" className="w-full">
          <TabsList className="grid w-full max-w-2xl grid-cols-3 bg-secondary">
            <TabsTrigger value="create" className="data-[state=active]:bg-primary">
              <Icon name="Plus" size={16} className="mr-2" />
              Создать закупку
            </TabsTrigger>
            <TabsTrigger value="monitor" className="data-[state=active]:bg-primary">
              <Icon name="BarChart3" size={16} className="mr-2" />
              Мониторинг ({purchases.length})
            </TabsTrigger>
            <TabsTrigger value="webhooks" className="data-[state=active]:bg-primary">
              <Icon name="Webhook" size={16} className="mr-2" />
              Журнал вебхуков ({webhooks.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="mt-6">
            <CreatePurchaseTab
              apiUrl={API_URL}
              onPurchaseCreated={fetchMonitorData}
              onShowToast={handleShowToast}
            />
          </TabsContent>

          <TabsContent value="monitor" className="mt-6">
            <PurchasesMonitorTab purchases={purchases} loading={loadingMonitor} />
          </TabsContent>

          <TabsContent value="webhooks" className="mt-6">
            <WebhooksTab webhooks={webhooks} loading={loadingMonitor} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
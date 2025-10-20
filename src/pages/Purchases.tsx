import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Icon from '@/components/ui/icon';
import { useNavigate } from 'react-router-dom';

export default function Purchases() {
  const navigate = useNavigate();

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
              <p className="text-muted-foreground">Работа с закупками и заявками</p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Модуль в разработке</CardTitle>
            <CardDescription>Функционал работы с закупками будет добавлен в ближайшее время</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Icon name="Construction" size={64} className="text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Здесь будет управление закупками</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DiagnosticResult } from './types';

interface DiagnosticSummaryProps {
  result: DiagnosticResult;
}

export default function DiagnosticSummary({ result }: DiagnosticSummaryProps) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <Card className="bg-secondary/50">
        <CardHeader className="pb-2">
          <CardDescription className="text-xs">Активных компаний в Битрикс24</CardDescription>
          <CardTitle className="text-2xl">{result.summary.total_bitrix}</CardTitle>
        </CardHeader>
      </Card>
      <Card className="bg-secondary/50">
        <CardHeader className="pb-2">
          <CardDescription className="text-xs">Реквизитов в БД</CardDescription>
          <CardTitle className="text-2xl">{result.summary.total_requisites}</CardTitle>
        </CardHeader>
      </Card>
      <Card className="bg-accent/10 border-accent/20">
        <CardHeader className="pb-2">
          <CardDescription className="text-xs">Мусорных реквизитов</CardDescription>
          <CardTitle className="text-2xl text-accent">{result.summary.orphaned_requisites}</CardTitle>
        </CardHeader>
      </Card>
    </div>
  );
}

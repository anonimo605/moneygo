"use client";

import { useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, orderBy } from 'firebase/firestore';
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { es } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrency } from '@/context/currency-context';

type Transaction = {
  id: string;
  transactionDate: string;
  type: string;
  amount: number;
  description: string;
  status: 'completed' | 'pending' | 'failed';
  referenceNumber?: string;
};

type DepositRequest = {
  id: string;
  userId: string;
  requestDate: string;
  amount: number;
  networkName: string;
  status: 'pending' | 'approved' | 'rejected';
}

function TransactionRowSkeleton() {
  return (
    <TableRow>
      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
      <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
    </TableRow>
  )
}

export default function TransactionsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { formatCurrency } = useCurrency();

  const mainWalletQuery = useMemoFirebase(() => 
    user ? query(collection(firestore, `users/${user.uid}/wallets`)) : null, 
    [user, firestore]
  );
  const { data: wallets } = useCollection(mainWalletQuery);
  const mainWallet = wallets?.[0];

  const transactionsQuery = useMemoFirebase(() => 
    user && mainWallet ? query(collection(firestore, `users/${user.uid}/wallets/${mainWallet.id}/transactions`), orderBy("transactionDate", "desc")) : null, 
    [user, mainWallet, firestore]
  );
  const { data: transactions, isLoading: isLoadingTransactions } = useCollection<Transaction>(transactionsQuery);

  const depositRequestsQuery = useMemoFirebase(() =>
    user ? query(collection(firestore, 'depositRequests'), orderBy("requestDate", "desc")) : null,
    [user, firestore]
  );
  const { data: depositRequests, isLoading: isLoadingRequests } = useCollection<DepositRequest>(depositRequestsQuery);
  
  const userDepositRequests = useMemo(() => {
    if (!depositRequests || !user) return [];
    return depositRequests.filter(req => req.userId === user.uid);
  }, [depositRequests, user]);
  
  const combinedHistory = useMemo(() => {
    const transactionItems = (transactions || [])
      .map(t => {
        let description = t.description;
        if (t.type === 'deposit-approved' && t.referenceNumber) {
          description = `Depósito aprobado (Ref: ${t.referenceNumber})`;
        } else if (t.type === 'withdrawal-request') {
          description = `Solicitud de retiro`
        }

        return {
          id: t.id,
          date: t.transactionDate,
          description: description,
          amount: t.amount,
          status: t.status as 'completed' | 'pending' | 'failed',
          type: t.type,
        }
      });
      
    const pendingAndRejectedDeposits = (userDepositRequests || [])
      .filter(req => req.status === 'pending' || req.status === 'rejected')
      .map(req => ({
        id: req.id,
        date: req.requestDate,
        description: `Solicitud de depósito via ${req.networkName}`,
        amount: req.amount,
        status: req.status as 'pending' | 'rejected',
        type: 'deposit' as const
      }));
      
    const allItems = [...transactionItems, ...pendingAndRejectedDeposits];
    allItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    return allItems;
  }, [transactions, userDepositRequests]);

  const isLoading = isLoadingTransactions || isLoadingRequests;

  const getStatusLabel = (status: 'completed' | 'pending' | 'failed' | 'rejected') => {
      switch (status) {
          case 'completed': return 'Completado';
          case 'pending': return 'Pendiente';
          case 'failed': return 'Fallido';
          case 'rejected': return 'Rechazado';
          default: return status;
      }
  }


  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline">Transacciones</h1>
        <p className="text-muted-foreground">
          Ve y gestiona todo tu historial de transacciones y solicitudes.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Historial de Transacciones</CardTitle>
          <CardDescription>
            Una lista completa de todas tus transacciones y solicitudes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isLoading && combinedHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 text-center border-2 border-dashed rounded-lg p-12">
              <h3 className="text-2xl font-bold tracking-tight">
                No tienes transacciones
              </h3>
              <p className="text-sm text-muted-foreground">
                Comienza a depositar fondos para ver tu historial.
              </p>
            </div>
          ) : (
             <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <>
                    <TransactionRowSkeleton />
                    <TransactionRowSkeleton />
                    <TransactionRowSkeleton />
                  </>
                ) : (
                   combinedHistory.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {format(new Date(item.date), "d MMM, yyyy", { locale: es })}
                      </TableCell>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className={`text-right font-semibold ${item.amount > 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {item.type === 'deposit' ? formatCurrency(item.amount, {currency: 'USD'}) : `${item.amount > 0 ? '+' : ''}${formatCurrency(item.amount, {currency: 'USD'})}` }
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            item.status === "completed"
                              ? "default"
                              : item.status === "pending"
                              ? "secondary"
                              : "destructive"
                          }
                          className="capitalize"
                        >
                          {getStatusLabel(item.status)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

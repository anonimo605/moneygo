

'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, DollarSign, Copy, CheckCircle } from 'lucide-react';
import { useCurrency } from '@/context/currency-context';
import type { UserProfile, Transaction } from '@/lib/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { UserPlansModal } from '@/app/dashboard/components/UserPlansModal';
import { Input } from "@/components/ui/input";
import { generateReferralCodeFromUID } from "@/lib/referral";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";


const ReferralSection = () => {
    const { user, isUserLoading } = useUser();
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);
    const [referralLink, setReferralLink] = useState('');

    useEffect(() => {
        if (user) {
            const ownReferralCode = generateReferralCodeFromUID(user.uid);
            const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
            setReferralLink(`${baseUrl}/?ref=${ownReferralCode}`);
        }
    }, [user]);

    const handleCopy = () => {
        if (!referralLink) return;
        navigator.clipboard.writeText(referralLink);
        setShowSuccessDialog(true);
    };

    return (
        <>
            <Card className="w-full shadow-lg">
                <CardHeader className="flex flex-row items-center gap-4">
                    <div className="bg-primary/10 p-3 rounded-full">
                        <Users className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <CardTitle>Invita y Gana</CardTitle>
                        <CardDescription>Comparte tu enlace de referido con amigos.</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <p className="text-sm text-muted-foreground">Tu enlace de referido:</p>
                        <div className="flex items-center gap-2 mt-1">
                            <Input
                                readOnly
                                value={isUserLoading ? "Cargando..." : referralLink}
                                placeholder="Generando tu enlace..."
                                className="bg-muted border-0"
                            />
                            <Button variant="ghost" size="icon" onClick={handleCopy} disabled={!referralLink || isUserLoading}>
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                    <Button className="w-full" onClick={handleCopy} disabled={!referralLink || isUserLoading}>
                        <Copy className="mr-2 h-4 w-4" /> Invitar ahora
                    </Button>
                </CardContent>
            </Card>

            <AlertDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader className="items-center text-center">
                        <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
                        <AlertDialogTitle className="text-lg">¡Enlace Copiado!</AlertDialogTitle>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="sm:justify-center">
                        <AlertDialogAction 
                          onClick={() => setShowSuccessDialog(false)}
                        >
                            Cerrar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};

const TeamPage = () => {
  const { user } = useUser();
  const firestore = useFirestore();
  const { formatCurrency } = useCurrency();
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isPlansModalOpen, setIsPlansModalOpen] = useState(false);

  const userQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'users'), where('id', '==', user.uid));
  }, [firestore, user]);
  const { data: userData } = useCollection<UserProfile>(userQuery);
  const currentUser = userData?.[0];

  const referralsQuery = useMemoFirebase(() => {
    if (!firestore || !currentUser?.referralCode) return null;
    return query(collection(firestore, 'users'), where('referredBy', '==', currentUser.referralCode));
  }, [firestore, currentUser]);
  const { data: referredUsers, isLoading: isLoadingReferrals } = useCollection<UserProfile>(referralsQuery);

    const commissionsQuery = useMemoFirebase(() => {
      if(!firestore || !user) return null;
       const walletRef = collection(firestore, `users/${user.uid}/wallets`);
        return query(walletRef);
    }, [firestore, user]);
    
    const {data: wallets} = useCollection(commissionsQuery);
    const mainWallet = wallets?.[0];

    const commissionTransactionsQuery = useMemoFirebase(() => {
        if(!mainWallet) return null;
        return query(collection(firestore, `users/${user.uid}/wallets/${mainWallet.id}/transactions`), where('type', '==', 'referral-commission'));
    }, [mainWallet]);

    const { data: commissionTransactions } = useCollection<Transaction>(commissionTransactionsQuery);


  const totalCommissions = useMemo(() => {
    return commissionTransactions?.reduce((acc, curr) => acc + curr.amount, 0) || 0;
  }, [commissionTransactions]);

  const teamBalance = useMemo(() => {
    return referredUsers?.reduce((acc, curr) => acc + (curr.balance ?? 0), 0) || 0;
  }, [referredUsers]);

  const handleViewPlans = (referredUser: UserProfile) => {
    setSelectedUser(referredUser);
    setIsPlansModalOpen(true);
  };


  return (
    <>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Mi Equipo de Referidos</h1>
        
        <ReferralSection />

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Referidos Totales</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{referredUsers?.length ?? 0}</div>
              <p className="text-xs text-muted-foreground">Usuarios que has invitado</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Comisiones Ganadas</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalCommissions)}</div>
              <p className="text-xs text-muted-foreground">Ganancias totales por tu equipo</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Balance del Equipo</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(teamBalance)}</div>
              <p className="text-xs text-muted-foreground">Suma de saldos de tus referidos</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Miembros del Equipo</CardTitle>
            <CardDescription>
              Aquí puedes ver los usuarios que se han unido con tu código.
            </CardDescription>
          </CardHeader>
          <CardContent>
              {isLoadingReferrals ? <p>Cargando miembros...</p> : (
              <Table>
                  <TableHeader>
                  <TableRow>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Fecha de Registro</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                  </TableHeader>
                  <TableBody>
                  {referredUsers && referredUsers.length > 0 ? (
                      referredUsers.map(refUser => (
                      <TableRow key={refUser.id}>
                          <TableCell className="font-medium">{refUser.email}</TableCell>
                          <TableCell>
                          {format(new Date((refUser as any).registrationDate), 'dd MMM yyyy', { locale: es })}
                          </TableCell>
                          <TableCell>{formatCurrency(refUser.balance ?? 0)}</TableCell>
                          <TableCell className="text-right">
                              <Button variant="outline" size="sm" onClick={() => handleViewPlans(refUser)}>
                                  Ver Planes
                              </Button>
                          </TableCell>
                      </TableRow>
                      ))
                  ) : (
                      <TableRow>
                          <TableCell colSpan={4} className="text-center">
                              Aún no tienes referidos. ¡Comparte tu enlace!
                          </TableCell>
                      </TableRow>
                  )}
                  </TableBody>
              </Table>
              )}
          </CardContent>
        </Card>
      </div>
      
      {selectedUser && isPlansModalOpen && (
        <UserPlansModal 
            user={selectedUser}
            isOpen={isPlansModalOpen}
            onOpenChange={setIsPlansModalOpen}
        />
      )}
    </>
  );
};

export default TeamPage;

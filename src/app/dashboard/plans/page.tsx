

"use client";

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc, getDoc, writeBatch, serverTimestamp, increment, getDocs, limit } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useCurrency } from '@/context/currency-context';
import { Briefcase, PiggyBank, BadgePercent, Calendar, CheckCircle, Wallet, AlertCircle, TrendingUp, Calculator, LineChart, Clock } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { addDays, format, formatDistanceToNow, isAfter } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import type { AppConfig, UserProfile, InvestmentPlan as TInvestmentPlan } from '@/lib/types';
import { Label } from '@/components/ui/label';

type InvestmentPlan = TInvestmentPlan;

type UserWallet = {
  id: string;
  balance: number;
};

const InvestmentCalculator = () => {
    const [amount, setAmount] = useState('');
    const [percentage, setPercentage] = useState('');
    const [days, setDays] = useState('');
    const { formatCurrency } = useCurrency();

    const { dailyReturn, weeklyReturn, monthlyReturn, totalReturn } = useMemo(() => {
        const numAmount = parseFloat(amount);
        const numPercentage = parseFloat(percentage);

        if (isNaN(numAmount) || isNaN(numPercentage) || numAmount <= 0 || numPercentage <= 0) {
            return { dailyReturn: 0, weeklyReturn: 0, monthlyReturn: 0, totalReturn: 0 };
        }

        const daily = numAmount * (numPercentage / 100);
        const weekly = daily * 7;
        const monthly = daily * 30;
        
        const numDays = parseInt(days, 10);
        const total = isNaN(numDays) || numDays <= 0 ? 0 : daily * numDays;

        return { dailyReturn: daily, weeklyReturn: weekly, monthlyReturn: monthly, totalReturn: total };

    }, [amount, percentage, days]);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Calculator /> Calculadora de Inversión</CardTitle>
                <CardDescription>Simula tus ganancias potenciales antes de invertir.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="calc-amount">Monto (USD)</Label>
                        <Input id="calc-amount" type="number" placeholder="Ej: 100" value={amount} onChange={e => setAmount(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="calc-percentage">Retorno Diario (%)</Label>
                        <Input id="calc-percentage" type="number" placeholder="Ej: 6" value={percentage} onChange={e => setPercentage(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="calc-days">Duración (días)</Label>
                        <Input id="calc-days" type="number" placeholder="Ej: 75" value={days} onChange={e => setDays(e.target.value)} />
                    </div>
                </div>
                {(dailyReturn > 0) && (
                    <Card className="bg-muted">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg flex items-center gap-2"><LineChart/> Proyección de Ganancias</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Ganancia Diaria:</span>
                                <span className="font-bold">{formatCurrency(dailyReturn, { currency: 'USD' })}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Ganancia Semanal:</span>
                                <span className="font-bold">{formatCurrency(weeklyReturn, { currency: 'USD' })}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Ganancia en 30 días:</span>
                                <span className="font-bold">{formatCurrency(monthlyReturn, { currency: 'USD' })}</span>
                            </div>
                            {totalReturn > 0 && (
                                <div className="flex justify-between items-center pt-2 border-t mt-2">
                                <span className="font-semibold">Ganancia Total del Ciclo:</span>
                                <span className="font-bold text-lg text-primary">{formatCurrency(totalReturn, { currency: 'USD' })}</span>
                            </div>
                            )}
                        </CardContent>
                    </Card>
                )}
            </CardContent>
        </Card>
    )
}

const InvestDialog = ({ plan, wallet, onInvested }: { plan: InvestmentPlan, wallet: UserWallet | undefined, onInvested: () => void }) => {
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { formatCurrency } = useCurrency();

  const handleInvest = async () => {
    const investmentAmount = parseFloat(amount);
    if (!user || !firestore || !wallet || !investmentAmount || investmentAmount <= 0) {
      toast({ variant: 'destructive', title: 'Error', description: 'Por favor, introduce un monto válido.' });
      return;
    }
    if (investmentAmount > wallet.balance) {
      toast({ variant: 'destructive', title: 'Fondos insuficientes', description: `Tu saldo es de ${formatCurrency(wallet.balance, { currency: 'USD' })}.` });
      return;
    }
    if (plan.minInvestment && investmentAmount < plan.minInvestment) {
        toast({ variant: 'destructive', title: 'Monto muy bajo', description: `La inversión mínima para este plan es de ${formatCurrency(plan.minInvestment, { currency: 'USD' })}.` });
        return;
    }
    if (plan.maxInvestment && investmentAmount > plan.maxInvestment) {
        toast({ variant: 'destructive', title: 'Monto muy alto', description: `La inversión máxima para este plan es de ${formatCurrency(plan.maxInvestment, { currency: 'USD' })}.` });
        return;
    }

    setIsLoading(true);
    onInvested(); // Close dialog immediately
    
    try {
      const batch = writeBatch(firestore);
      const startDate = new Date();
      const endDate = addDays(startDate, plan.durationDays);
      const userRef = doc(firestore, `users/${user.uid}`);

      const investmentRef = doc(collection(firestore, 'userInvestments'));
      batch.set(investmentRef, {
        id: investmentRef.id,
        userId: user.uid,
        walletId: wallet.id,
        planId: plan.id,
        planName: plan.name,
        investedAmount: investmentAmount,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        lastCollectionDate: startDate.toISOString(), 
        isActive: true,
        // Denormalize plan details for safe deletion
        dailyReturnPercentage: plan.dailyReturnPercentage,
        durationDays: plan.durationDays,
        imageUrl: plan.imageUrl || null,
      });

      const walletRef = doc(firestore, `users/${user.uid}/wallets/${wallet.id}`);
      batch.update(walletRef, { balance: increment(-investmentAmount) });
      
      batch.update(userRef, { balance: increment(-investmentAmount) });

      const transactionRef = doc(collection(firestore, `users/${user.uid}/wallets/${wallet.id}/transactions`));
      batch.set(transactionRef, {
          id: transactionRef.id,
          walletId: wallet.id,
          transactionDate: startDate.toISOString(),
          amount: -investmentAmount,
          description: `Inversión en ${plan.name}`,
          type: 'investment-start',
          status: 'completed',
      });

      // Check for referral commission
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data() as UserProfile;

      if(userData.referredBy && userData.hasInvested === false) { // This is the first investment
          const configDoc = await getDoc(doc(firestore, 'app_config', 'main'));
          const appConfig = configDoc.data() as AppConfig;
          const commissionPercentage = appConfig.referralCommissionPercentage || 0;

          if (commissionPercentage > 0) {
              const referrerQuery = query(collection(firestore, 'users'), where('referralCode', '==', userData.referredBy), limit(1));
              const referrerSnap = await getDocs(referrerQuery);
              
              if (!referrerSnap.empty) {
                  const referrer = referrerSnap.docs[0];
                  const commissionAmount = investmentAmount * (commissionPercentage / 100);

                  const referrerWalletQuery = query(collection(firestore, 'users', referrer.id, 'wallets'), limit(1));
                  const referrerWalletSnap = await getDocs(referrerWalletQuery);
                  
                  if (!referrerWalletSnap.empty) {
                      const referrerWallet = referrerWalletSnap.docs[0];

                      batch.update(referrer.ref, { balance: increment(commissionAmount) });
                      batch.update(referrerWallet.ref, { balance: increment(commissionAmount) });

                      const commissionTransactionRef = doc(collection(referrerWallet.ref, 'transactions'));
                      batch.set(commissionTransactionRef, {
                          id: commissionTransactionRef.id,
                          walletId: referrerWallet.id,
                          transactionDate: startDate.toISOString(),
                          amount: commissionAmount,
                          description: `Comisión por referido: ${userData.email || user.uid}`,
                          type: 'referral-commission',
                          status: 'completed'
                      });
                  }
              }
          }
           // Mark that the user has made their first investment
          batch.update(userRef, { hasInvested: true });
      }

      await batch.commit();
      toast({
        title: "¡Inversión Exitosa!",
        description: `Has invertido ${formatCurrency(investmentAmount)} en ${plan.name}.`
      });
    } catch (error: any) {
      console.error("Investment failed: ", error);
      toast({ variant: 'destructive', title: 'Error en la inversión', description: error.message || 'No se pudo completar la operación.' });
    } finally {
      setIsLoading(false);
      setAmount('');
    }
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Invertir en {plan.name}</DialogTitle>
        <DialogDescription>
          Tu saldo actual es de {formatCurrency(wallet?.balance ?? 0, { currency: 'USD' })}. Ingresa la cantidad que deseas invertir.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <Input
          type="number"
          placeholder="Monto a invertir"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="text-lg"
        />
        {(plan.minInvestment || plan.maxInvestment) && (
            <div className="text-xs text-muted-foreground p-2 bg-muted rounded-md flex items-center gap-2">
                <AlertCircle className="h-4 w-4"/>
                <div>
                {plan.minInvestment && <p>Mínimo: {formatCurrency(plan.minInvestment, { currency: 'USD' })}</p>}
                {plan.maxInvestment && <p>Máximo: {formatCurrency(plan.maxInvestment, { currency: 'USD' })}</p>}
                </div>
            </div>
        )}
        <Button onClick={handleInvest} disabled={isLoading} className="w-full">
          {isLoading ? 'Procesando...' : `Invertir ${formatCurrency(parseFloat(amount) || 0, { currency: 'USD' })}`}
        </Button>
      </div>
    </DialogContent>
  );
};


export default function PlansPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { formatCurrency } = useCurrency();
    const [selectedPlan, setSelectedPlan] = useState<InvestmentPlan | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    
    const plansQuery = useMemoFirebase(
        () => (firestore ? query(collection(firestore, "investmentPlans"), where("isActive", "==", true)) : null),
        [firestore]
    );
    const { data: plans, isLoading: isLoadingPlans } = useCollection<InvestmentPlan>(plansQuery);

    const availablePlans = useMemo(() => {
        if (!plans) return [];
        const now = new Date();
        return plans.filter(plan => {
            if (!plan.isActive) return false;
            const startDate = plan.availabilityStartDate ? new Date(plan.availabilityStartDate) : null;
            const endDate = plan.availabilityEndDate ? new Date(plan.availabilityEndDate) : null;

            if (startDate && isAfter(now, startDate) === false) return false;
            if (endDate && isAfter(now, endDate)) return false;

            return true;
        });
    }, [plans]);

    const walletsQuery = useMemoFirebase(
      () => (user ? query(collection(firestore, `users/${user.uid}/wallets`)) : null),
      [firestore, user]
    );
    const { data: wallets } = useCollection<UserWallet>(walletsQuery);
    const mainWallet = wallets?.[0];

    const handlePlanClick = (plan: InvestmentPlan) => {
        setSelectedPlan(plan);
        setIsDialogOpen(true);
    };

    const getPlanLimitText = (plan: InvestmentPlan) => {
        if (plan.minInvestment && plan.maxInvestment) {
          return `Inversión: ${formatCurrency(plan.minInvestment, {currency: 'USD', minimumFractionDigits: 0})} - ${formatCurrency(plan.maxInvestment, { currency: 'USD', minimumFractionDigits: 0})}`;
        }
        if (plan.minInvestment) {
          return `Mínimo: ${formatCurrency(plan.minInvestment, { currency: 'USD', minimumFractionDigits: 0})}`;
        }
        if (plan.maxInvestment) {
          return `Máximo: ${formatCurrency(plan.maxInvestment, { currency: 'USD', minimumFractionDigits: 0})}`;
        }
        return 'Inversión flexible';
    }


  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2"><Briefcase/> Planes de Inversión</h1>
        <p className="text-muted-foreground">
          Invierte tus fondos y obtén un retorno diario.
        </p>
      </div>

      <InvestmentCalculator />

      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Planes Disponibles</h2>
        {isLoadingPlans && <p>Cargando planes...</p>}
        {!isLoadingPlans && (!availablePlans || availablePlans.length === 0) ? (
          <p className="text-muted-foreground">No hay planes de inversión disponibles en este momento.</p>
        ) : (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {availablePlans?.map((plan) => (
                <DialogTrigger key={plan.id} asChild>
                    <Card onClick={() => handlePlanClick(plan)} className="cursor-pointer hover:border-primary transition-all flex flex-col overflow-hidden">
                      <div className="relative aspect-video w-full">
                        <Image src={plan.imageUrl || `https://picsum.photos/seed/${plan.id}/600/400`} alt={plan.name} fill style={{objectFit: 'cover'}} />
                      </div>
                      <div className="flex flex-col flex-grow p-6">
                        <CardHeader className="p-0 pb-4">
                            <CardTitle className="flex items-center gap-2"><PiggyBank className="text-primary"/> {plan.name}</CardTitle>
                            {plan.availabilityEndDate && (
                                <Badge variant="destructive" className="w-fit flex items-center gap-1.5">
                                    <Clock className="h-3 w-3" />
                                    <span>Termina {formatDistanceToNow(new Date(plan.availabilityEndDate), { locale: es, addSuffix: true })}</span>
                                </Badge>
                            )}
                        </CardHeader>
                        <CardContent className="p-0 space-y-2 flex-grow flex flex-col justify-between">
                            <div className="space-y-2">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground flex items-center gap-1"><BadgePercent/> Retorno Diario</span>
                                    <span className="font-bold">{plan.dailyReturnPercentage}%</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground flex items-center gap-1"><Calendar/> Duración</span>
                                    <span className="font-bold">{plan.durationDays} días</span>
                                </div>
                                 <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground flex items-center gap-1"><Wallet/> Inversión</span>
                                    <span className="font-bold text-xs">{getPlanLimitText(plan)}</span>
                                </div>
                            </div>
                            <Button variant="outline" className="w-full mt-4">Invertir Ahora</Button>
                        </CardContent>
                      </div>
                    </Card>
                </DialogTrigger>
              ))}
            </div>
            {selectedPlan && mainWallet && <InvestDialog plan={selectedPlan} wallet={mainWallet} onInvested={() => setIsDialogOpen(false)} />}
          </Dialog>
        )}
      </div>
    </div>
  );
}

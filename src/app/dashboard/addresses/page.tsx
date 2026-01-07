'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  useUser,
  useFirestore,
  useDoc,
  useMemoFirebase,
  useCollection,
} from '@/firebase';
import {
  doc,
  updateDoc,
  writeBatch,
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  increment,
  addDoc,
  getCountFromServer,
} from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  AlertCircle,
  Banknote,
  Bitcoin,
  Clock,
  Contact,
  Edit,
  Loader2,
  Save,
  Send,
  CheckCircle,
  Wallet,
  Info,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCurrency } from '@/context/currency-context';
import type {
  UserProfile,
  WithdrawalConfig,
  WithdrawalRequest,
} from '@/lib/types';
import { format } from 'date-fns';

const nequiFormSchema = z.object({
  withdrawalNequi: z.string().optional(),
  nequiOwnerName: z.string().optional(),
});

const usdtFormSchema = z.object({
  withdrawalUsdtBep20: z.string().optional(),
});

function WithdrawalAddresses() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isNequiFormOpen, setIsNequiFormOpen] = useState(false);
  const [isUsdtFormOpen, setIsUsdtFormOpen] = useState(false);

  const userDocRef = useMemoFirebase(
    () => (user ? doc(firestore, `users/${user.uid}`) : null),
    [firestore, user]
  );
  const { data: userProfile, isLoading: isLoadingProfile } =
    useDoc<UserProfile>(userDocRef);

  const nequiForm = useForm<z.infer<typeof nequiFormSchema>>({
    resolver: zodResolver(nequiFormSchema),
    defaultValues: {
      withdrawalNequi: '',
      nequiOwnerName: '',
    },
  });

  const usdtForm = useForm<z.infer<typeof usdtFormSchema>>({
    resolver: zodResolver(usdtFormSchema),
    defaultValues: {
      withdrawalUsdtBep20: '',
    },
  });

  useEffect(() => {
    if (userProfile) {
      nequiForm.reset({
        withdrawalNequi: userProfile.withdrawalNequi || '',
        nequiOwnerName: userProfile.nequiOwnerName || '',
      });
      usdtForm.reset({
        withdrawalUsdtBep20: userProfile.withdrawalUsdtBep20 || '',
      });
    }
  }, [userProfile, nequiForm, usdtForm]);

  async function onNequiSubmit(values: z.infer<typeof nequiFormSchema>) {
    if (!userDocRef) return;
    try {
      await updateDoc(userDocRef, values);
      toast({
        title: 'Éxito',
        description: 'Tu información de Nequi ha sido actualizada.',
      });
      setIsNequiFormOpen(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo actualizar tu información de Nequi.',
      });
    }
  }

  async function onUsdtSubmit(values: z.infer<typeof usdtFormSchema>) {
    if (!userDocRef) return;
    try {
      await updateDoc(userDocRef, values);
      toast({
        title: 'Éxito',
        description: 'Tus dirección de USDT ha sido actualizada.',
      });
      setIsUsdtFormOpen(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo actualizar la dirección de USDT.',
      });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mis Direcciones de Retiro</CardTitle>
        <CardDescription>
          Gestiona tus cuentas para recibir fondos. Asegúrate de que la
          información sea correcta.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Banknote className="text-green-500" /> Nequi
            </CardTitle>
            <Dialog open={isNequiFormOpen} onOpenChange={setIsNequiFormOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Edit className="h-4 w-4" />
                  <span className="sr-only">Editar Nequi</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Editar Dirección de Nequi</DialogTitle>
                </DialogHeader>
                <Form {...nequiForm}>
                  <form
                    onSubmit={nequiForm.handleSubmit(onNequiSubmit)}
                    className="space-y-6"
                  >
                    <FormField
                      control={nequiForm.control}
                      name="withdrawalNequi"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número Nequi</FormLabel>
                          <FormControl>
                            <Input placeholder="Tu número de Nequi" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={nequiForm.control}
                      name="nequiOwnerName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre del Titular (Nequi)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Nombre completo del dueño de la cuenta"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button variant="ghost">Cancelar</Button>
                      </DialogClose>
                      <Button
                        type="submit"
                        disabled={nequiForm.formState.isSubmitting}
                      >
                        {nequiForm.formState.isSubmitting ? (
                          <Loader2 className="animate-spin" />
                        ) : (
                          'Guardar'
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {isLoadingProfile ? (
              <Loader2 className="animate-spin" />
            ) : userProfile?.withdrawalNequi ? (
              <div>
                <p className="font-mono text-sm">
                  {userProfile.withdrawalNequi}
                </p>
                <p className="text-xs text-muted-foreground">
                  {userProfile.nequiOwnerName}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No has agregado una cuenta Nequi.
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bitcoin className="text-orange-400" /> USDT (BEP-20)
            </CardTitle>
            <Dialog open={isUsdtFormOpen} onOpenChange={setIsUsdtFormOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Edit className="h-4 w-4" />
                  <span className="sr-only">Editar USDT</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Editar Dirección de USDT</DialogTitle>
                </DialogHeader>
                <Form {...usdtForm}>
                  <form
                    onSubmit={usdtForm.handleSubmit(onUsdtSubmit)}
                    className="space-y-6"
                  >
                    <FormField
                      control={usdtForm.control}
                      name="withdrawalUsdtBep20"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>USDT Dirección (Red BEP-20)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Tu dirección de billetera USDT BEP-20"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button variant="ghost">Cancelar</Button>
                      </DialogClose>
                      <Button
                        type="submit"
                        disabled={usdtForm.formState.isSubmitting}
                      >
                        {usdtForm.formState.isSubmitting ? (
                          <Loader2 className="animate-spin" />
                        ) : (
                          'Guardar'
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoadingProfile ? (
              <Loader2 className="animate-spin" />
            ) : (
              <>
                {userProfile?.withdrawalUsdtBep20 ? (
                  <div className="pt-2">
                    <p className="font-semibold text-sm">Red BEP-20</p>
                    <p className="font-mono text-xs break-all">
                      {userProfile.withdrawalUsdtBep20}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground pt-2">
                    No has agregado dirección BEP-20.
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}

function WithdrawalRequestForm({
  userProfile,
  config,
  methodType,
}: {
  userProfile: UserProfile;
  config: WithdrawalConfig;
  methodType: 'nequi' | 'usdt';
}) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { formatCurrency, exchangeRate } = useCurrency();
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const walletsQuery = useMemoFirebase(
    () => (user ? query(collection(firestore, `users/${user.uid}/wallets`)) : null),
    [firestore, user]
  );
  const { data: wallets } = useCollection(walletsQuery);
  const mainWallet = wallets?.[0];

  const isNequi = methodType === 'nequi';

  // --- Start Calculation Logic ---
  const amountInCop = isNequi ? parseFloat(amount) || 0 : 0;
  const amountInUsdFromNequi = isNequi ? amountInCop / exchangeRate : 0;

  const amountInUsdFromUsdt = !isNequi ? parseFloat(amount) || 0 : 0;

  const totalAmountInUsd = isNequi ? amountInUsdFromNequi : amountInUsdFromUsdt;

  const feeInUsd = totalAmountInUsd * config.feePercentage;
  const finalAmountInUsd = totalAmountInUsd - feeInUsd;
  const finalAmountInCop = finalAmountInUsd * exchangeRate;
  // --- End Calculation Logic ---

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = isNequi ? 'Nequi' : 'USDT_BEP20';
    if (!user || !firestore || !mainWallet || !method || totalAmountInUsd <= 0) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Por favor, completa todos los campos correctamente.',
      });
      return;
    }

    // Validations
    if (totalAmountInUsd < config.minWithdrawal) {
      toast({
        variant: 'destructive',
        title: 'Monto muy bajo',
        description: `El monto mínimo para retirar es de ${formatCurrency(
          config.minWithdrawal
        )}.`,
      });
      return;
    }
    if (totalAmountInUsd > mainWallet.balance) {
      toast({
        variant: 'destructive',
        title: 'Fondos insuficientes',
        description: `Tu saldo es de ${formatCurrency(mainWallet.balance)}.`,
      });
      return;
    }

    setIsLoading(true);

    try {
      const todayString = format(new Date(), 'yyyy-MM-dd');
      const requestsTodayQuery = query(
        collection(firestore, 'withdrawalRequests'),
        where('userId', '==', user.uid),
        where('requestDay', '==', todayString)
      );
      const requestsTodaySnapshot = await getCountFromServer(requestsTodayQuery);
      const dailyCount = requestsTodaySnapshot.data().count;

      if (dailyCount >= config.dailyLimit) {
        toast({
          variant: 'destructive',
          title: 'Límite alcanzado',
          description: 'Has alcanzado tu límite de retiros por hoy.',
        });
        setIsLoading(false);
        return;
      }

      const walletAddressMap = {
        Nequi: userProfile.withdrawalNequi,
        USDT_BEP20: userProfile.withdrawalUsdtBep20,
      };
      const walletAddress =
        walletAddressMap[method as keyof typeof walletAddressMap];
      if (!walletAddress) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description:
            'La dirección de retiro no está configurada para este método.',
        });
        setIsLoading(false);
        return;
      }

      const batch = writeBatch(firestore);

      const transactionRef = doc(
        collection(firestore, `users/${user.uid}/wallets/${mainWallet.id}/transactions`)
      );
      batch.set(transactionRef, {
        id: transactionRef.id,
        walletId: mainWallet.id,
        transactionDate: new Date().toISOString(),
        amount: -totalAmountInUsd,
        description: `Solicitud de retiro a ${walletAddress}`,
        type: 'withdrawal-request',
        status: 'pending',
      });

      const requestRef = doc(collection(firestore, 'withdrawalRequests'));

      const requestData: any = {
        id: requestRef.id,
        userId: user.uid,
        userEmail: user.email,
        walletId: mainWallet.id,
        netAmount: finalAmountInUsd,
        feeAmount: feeInUsd,
        totalAmount: totalAmountInUsd,
        method,
        walletAddress,
        status: 'pending',
        requestDate: new Date().toISOString(),
        requestDay: todayString, // Add the simple date string
        transactionId: transactionRef.id,
      };
      if (method === 'Nequi') {
        requestData.nequiOwnerName = userProfile.nequiOwnerName;
      }

      batch.set(requestRef, requestData);

      const walletRefToUpdate = doc(
        firestore,
        `users/${user.uid}/wallets/${mainWallet.id}`
      );
      batch.update(walletRefToUpdate, {
        balance: increment(-totalAmountInUsd),
      });

      // Also update the user's main balance field
      const userRef = doc(firestore, `users/${user.uid}`);
      batch.update(userRef, {
          balance: increment(-totalAmountInUsd),
      });


      await batch.commit();

      toast({
        title: 'Solicitud Enviada',
        description: 'Tu solicitud de retiro ha sido enviada para su revisión.',
      });
      setAmount('');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'No se pudo procesar la solicitud.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!userProfile) return <Loader2 className="animate-spin" />;

  const balanceToShow = isNequi
    ? formatCurrency(mainWallet?.balance || 0, { currency: 'COP' })
    : formatCurrency(mainWallet?.balance || 0);

  const minWithdrawalDisplay = isNequi
    ? formatCurrency(config.minWithdrawal, { currency: 'COP' })
    : formatCurrency(config.minWithdrawal);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isNequi ? 'Retirar a Nequi (COP)' : 'Retirar USDT (USD)'}
        </CardTitle>
        <CardDescription>
          Disponible: <span className="font-bold">{balanceToShow}</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`amount-${methodType}`}>
              Monto a Retirar ({isNequi ? 'COP' : 'USD'})
            </Label>
            <Input
              id={`amount-${methodType}`}
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`Mínimo ${minWithdrawalDisplay}`}
            />
            {isNequi && amountInUsdFromNequi > 0 && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 pt-1">
                <Info className="h-3 w-3" />
                Equivalente a: {formatCurrency(amountInUsdFromNequi)}
              </p>
            )}
          </div>
          {totalAmountInUsd > 0 && (
            <div className="p-3 bg-muted rounded-md text-sm space-y-2">
              <div className="flex justify-between">
                <span>Monto Solicitado:</span>
                <span>
                  {isNequi
                    ? formatCurrency(amountInCop, {
                        currency: 'COP',
                        isValueInSourceCurrency: true,
                      })
                    : formatCurrency(totalAmountInUsd)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Comisión ({config.feePercentage * 100}%):</span>
                <span>- {formatCurrency(feeInUsd)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Total a Recibir:</span>
                <span>
                  {isNequi
                    ? formatCurrency(finalAmountInCop, {
                        currency: 'COP',
                        isValueInSourceCurrency: true,
                      })
                    : formatCurrency(finalAmountInUsd)}
                </span>
              </div>
            </div>
          )}
          <Button
            type="submit"
            className="w-full"
            disabled={
              isLoading ||
              !amount ||
              (isNequi
                ? !userProfile.withdrawalNequi
                : !userProfile.withdrawalUsdtBep20)
            }
          >
            {isLoading ? (
              <Loader2 className="mr-2 animate-spin" />
            ) : (
              <Send className="mr-2" />
            )}
            Solicitar Retiro
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function WithdrawalStatus({ config }: { config: WithdrawalConfig }) {
  const [status, setStatus] = useState<{
    isOpen: boolean;
    message: string;
    remainingTime?: string;
  }>({ isOpen: false, message: '' });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkStatus = () => {
      setIsLoading(false);
      const now = new Date();
      const dayNames = [
        'Domingo',
        'Lunes',
        'Martes',
        'Miércoles',
        'Jueves',
        'Viernes',
        'Sábado',
      ];
      const currentDay = dayNames[now.getDay()];

      if (!config.allowedDays?.includes(currentDay)) {
        setStatus({
          isOpen: false,
          message: 'Los retiros no están disponibles hoy.',
        });
        return;
      }

      const [startH, startM] = config.startTime.split(':').map(Number);
      const [endH, endM] = config.endTime.split(':').map(Number);
      const startTime = new Date(now);
      startTime.setHours(startH, startM, 0, 0);
      const endTime = new Date(now);
      endTime.setHours(endH, endM, 0, 0);

      if (now < startTime) {
        const diff = startTime.getTime() - now.getTime();
        const hours = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        setStatus({
          isOpen: false,
          message: `Los retiros abren en:`,
          remainingTime: `${hours}h ${minutes}m`,
        });
        return;
      }

      if (now > endTime) {
        setStatus({
          isOpen: false,
          message: 'El horario de retiros por hoy ha finalizado.',
        });
        return;
      }

      setStatus({ isOpen: true, message: 'Los retiros están abiertos.' });
    };

    if (config) {
      const interval = setInterval(checkStatus, 60000); // Check every minute
      checkStatus(); // Initial check

      return () => clearInterval(interval);
    } else {
      setIsLoading(false);
    }
  }, [config]);

  if (isLoading) {
    return (
      <div className="p-4 rounded-lg flex items-center justify-between bg-muted/50 text-muted-foreground">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin" />
          <p className="text-sm font-medium">Verificando estado...</p>
        </div>
      </div>
    );
  }

  if (!config || !status.message) return null;

  return (
    <div
      className={`p-4 rounded-lg flex items-center justify-between ${
        status.isOpen
          ? 'bg-green-500/10 text-green-700'
          : 'bg-destructive/10 text-destructive'
      }`}
    >
      <div className="flex items-center gap-3">
        {status.isOpen ? (
          <CheckCircle className="h-5 w-5" />
        ) : (
          <Clock className="h-5 w-5" />
        )}
        <p className="text-sm font-medium">{status.message}</p>
      </div>
      {status.remainingTime && (
        <p className="text-sm font-bold">{status.remainingTime}</p>
      )}
    </div>
  );
}

export default function WithdrawPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(
    () => (user ? doc(firestore, `users/${user.uid}`) : null),
    [firestore, user]
  );
  const { data: userProfile, isLoading: isLoadingProfile } =
    useDoc<UserProfile>(userDocRef);

  const configRef = useMemoFirebase(
    () => doc(firestore, 'withdrawal_config', 'main'),
    [firestore]
  );
  const { data: config, isLoading: isLoadingConfig } =
    useDoc<WithdrawalConfig>(configRef);

  const isLoading = isUserLoading || isLoadingProfile || isLoadingConfig;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
          <Send /> Retirar Fondos
        </h1>
        <p className="text-muted-foreground">
          Gestiona tus direcciones y solicita retiros a tus cuentas externas.
        </p>
      </div>

      {isLoading && <Loader2 className="mx-auto my-8 h-8 w-8 animate-spin" />}

      {!isLoading && config && userProfile ? (
        <>
          <WithdrawalStatus config={config} />
          <div className="grid md:grid-cols-2 gap-8">
            <WithdrawalRequestForm
              userProfile={userProfile}
              config={config}
              methodType="nequi"
            />
            <WithdrawalRequestForm
              userProfile={userProfile}
              config={config}
              methodType="usdt"
            />
          </div>
          <WithdrawalAddresses />
        </>
      ) : (
        !isLoading && (
          <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-center text-sm">
            La función de retiros no está configurada por el administrador en
            este momento.
          </div>
        )
      )}
    </div>
  );
}

    
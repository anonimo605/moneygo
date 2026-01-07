
'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, ChevronLeft, Send, Info } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useFirestore, useUser, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, addDoc, serverTimestamp, where, query } from 'firebase/firestore';
import { useCurrency } from '@/context/currency-context';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";


type DepositMethod = {
  id: string;
  name: string;
  address: string;
  qrCodeUrl: string;
  type: 'crypto' | 'fiat';
};

type UserWallet = {
  id: string;
  userId: string;
  name: string;
  balance: number;
  creationDate: string;
}

const CryptoDepositContent = () => {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const router = useRouter();

    const [view, setView] = useState<'selection' | 'details' | 'form'>('selection');
    const [selectedNetwork, setSelectedNetwork] = useState<DepositMethod | null>(null);

    const walletsQuery = useMemoFirebase(
        () => (user ? query(collection(firestore, `users/${user.uid}/wallets`)) : null),
        [firestore, user]
    );
    const { data: wallets } = useCollection<UserWallet>(walletsQuery);
    const mainWallet = wallets?.[0];

    const networksQuery = useMemoFirebase(
        () => (firestore ? query(collection(firestore, "depositNetworks"), where("type", "==", "crypto")) : null),
        [firestore]
    );
    const { data: networks, isLoading: isLoadingNetworks } = useCollection<DepositMethod>(networksQuery);

    const handleNetworkChange = (networkId: string) => {
        const network = networks?.find(n => n.id === networkId) || null;
        setSelectedNetwork(network);
        if (network) {
            setView('details');
        }
    };

    const handleCopyToClipboard = () => {
        if (selectedNetwork?.address) {
            navigator.clipboard.writeText(selectedNetwork.address);
            toast({
                title: "Copiado",
                description: "La dirección ha sido copiada al portapapeles.",
            });
        }
    };

    const handleProceedToForm = () => {
        setView('form');
    }

    if (view === 'selection') {
        return (
            <div className="space-y-4">
                <Label htmlFor="network">Selecciona la Red</Label>
                <Select onValueChange={handleNetworkChange} disabled={isLoadingNetworks}>
                    <SelectTrigger id="network">
                        <SelectValue placeholder={isLoadingNetworks ? "Cargando redes..." : "Elige una red..."} />
                    </SelectTrigger>
                    <SelectContent>
                        {networks && networks.map(network => (
                            <SelectItem key={network.id} value={network.id}>{network.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        );
    }

    if (view === 'details' && selectedNetwork) {
        return (
            <div className="space-y-4">
                <div className="flex flex-col items-center gap-4 text-center">
                    <div className="p-4 bg-white rounded-lg">
                        <Image
                            src={selectedNetwork.qrCodeUrl || "https://picsum.photos/seed/qr/200/200"}
                            data-ai-hint="qr code"
                            alt="QR Code"
                            width={160}
                            height={160}
                        />
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Escanea el código QR o copia la dirección de abajo.
                    </p>
                    <div className="w-full p-2 text-sm text-center break-all rounded-md bg-muted text-muted-foreground">
                        {selectedNetwork.address}
                    </div>
                    <Button variant="outline" className="w-full" onClick={handleCopyToClipboard}>
                        <Copy className="mr-2 h-4 w-4" />
                        Copiar Dirección
                    </Button>
                </div>
                <div className="p-4 rounded-lg bg-destructive/10 text-destructive">
                    <p className="text-xs text-center">
                        Asegúrate de enviar solo USDT a través de la red seleccionada. Enviar cualquier otra moneda a esta dirección puede resultar en la pérdida de tus fondos.
                    </p>
                </div>
                <Button className="w-full" onClick={handleProceedToForm}>He realizado el envío, continuar</Button>
                <Button variant="link" className="w-full" onClick={() => { setSelectedNetwork(null); setView('selection'); }}>Cambiar de red</Button>
            </div>
        )
    }

    if (view === 'form' && selectedNetwork && mainWallet) {
        return <DepositRequestForm wallet={mainWallet} network={selectedNetwork} onSubmitted={() => router.push('/dashboard')} />
    }

    return null;
}

const NequiDepositContent = () => {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const router = useRouter();
    const { formatCurrency, exchangeRate } = useCurrency();

    const [amount, setAmount] = useState("");
    const [referenceNumber, setReferenceNumber] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const nequiQuery = useMemoFirebase(
        () => (firestore ? query(collection(firestore, "depositNetworks"), where("type", "==", "fiat")) : null),
        [firestore]
    );
    const { data: nequiNetworks, isLoading: isLoadingNequi } = useCollection<DepositMethod>(nequiQuery);
    const nequiMethod = nequiNetworks?.[0];

    const walletsQuery = useMemoFirebase(
        () => (user ? query(collection(firestore, `users/${user.uid}/wallets`)) : null),
        [firestore, user]
    );
    const { data: wallets } = useCollection<UserWallet>(walletsQuery);
    const mainWallet = wallets?.[0];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firestore || !user || !mainWallet || !amount || !referenceNumber || !nequiMethod) {
            toast({ variant: "destructive", title: "Error", description: "Por favor completa todos los campos." });
            return;
        }
        setIsLoading(true);

        try {
            const depositRequestsRef = collection(firestore, 'depositRequests');
            await addDoc(depositRequestsRef, {
                userId: user.uid,
                walletId: mainWallet.id,
                networkName: nequiMethod.name,
                amount: parseFloat(amount),
                referenceNumber,
                status: 'pending',
                requestDate: new Date().toISOString(),
            });

            toast({ title: "Solicitud Enviada", description: "Tu solicitud de depósito se está procesando." });
            router.push('/dashboard');
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message || "No se pudo enviar la solicitud." });
        } finally {
            setIsLoading(false);
        }
    };
    
    const amountInCop = parseFloat(amount) || 0;
    const amountInUsd = amountInCop / exchangeRate;

    if (isLoadingNequi) return <p>Cargando información...</p>;
    if (!nequiMethod) return <p className="text-destructive">El método de pago Nequi no está configurado por el administrador.</p>;

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col items-center gap-4 text-center">
                <div className="p-4 bg-white rounded-lg">
                    <Image
                        src={nequiMethod.qrCodeUrl}
                        data-ai-hint="qr code"
                        alt="QR Code de Nequi"
                        width={240}
                        height={240}
                    />
                </div>
            </div>
            <div className="p-4 rounded-lg bg-destructive/10 text-destructive">
                <p className="text-xs text-center">
                    Tu saldo se mostrará en USD, pero los depósitos con Nequi se realizan en COP. El sistema hará la conversión automáticamente.
                </p>
            </div>
            <h3 className="text-lg font-medium border-t pt-4">Registra tu Depósito</h3>
            <div className="space-y-2">
                <Label htmlFor="amount-nequi">Cantidad Depositada (COP)</Label>
                <Input
                    id="amount-nequi"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Ej: 50000"
                    required
                />
                {amountInUsd > 0 && (
                     <p className="text-sm text-muted-foreground flex items-center gap-1.5 pt-1">
                        <Info className="h-3 w-3"/>
                        Recibirás aprox: {formatCurrency(amountInUsd, { currency: 'USD' })}
                    </p>
                )}
            </div>
            <div className="space-y-2">
                <Label htmlFor="reference-nequi">Número de Referencia del Pago</Label>
                <Input
                    id="reference-nequi"
                    type="text"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    placeholder="ID o número de referencia de la transacción"
                    required
                />
            </div>
            <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? 'Enviando...' : <><Send className="mr-2 h-4 w-4" /> Enviar Solicitud</>}
            </Button>
        </form>
    )
}

function DepositRequestForm({ wallet, network, onSubmitted }: { wallet: UserWallet, network: DepositMethod, onSubmitted: () => void }) {
    const [amount, setAmount] = useState("");
    const [referenceNumber, setReferenceNumber] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firestore || !user || !amount || !referenceNumber) {
            toast({ variant: "destructive", title: "Error", description: "Por favor completa todos los campos." });
            return;
        }
        setIsLoading(true);

        try {
            const depositRequestsRef = collection(firestore, 'depositRequests');
            await addDoc(depositRequestsRef, {
                userId: user.uid,
                walletId: wallet.id,
                networkName: network.name,
                amount: parseFloat(amount),
                referenceNumber,
                status: 'pending',
                requestDate: new Date().toISOString(),
            });

            toast({ title: "Solicitud Enviada", description: "Tu solicitud de depósito se está procesando." });
            onSubmitted();
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message || "No se pudo enviar la solicitud." });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 pt-4 border-t">
            <h3 className="text-lg font-medium">Registra tu Depósito</h3>
            <p className="text-sm text-muted-foreground">
                Después de enviar los fondos, ingresa los detalles aquí para que un administrador pueda verificar tu pago.
            </p>
            <div className="space-y-2">
                <Label htmlFor="amount">Cantidad Depositada (USD)</Label>
                <Input
                    id="amount"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Ej: 100.00"
                    required
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="reference">Número de Referencia del Pago</Label>
                <Input
                    id="reference"
                    type="text"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    placeholder="Hash de la transacción o ID de referencia"
                    required
                />
            </div>
            <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? 'Enviando...' : <><Send className="mr-2 h-4 w-4" /> Enviar Solicitud</>}
            </Button>
        </form>
    )
}

export default function DepositPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const method = searchParams.get('method');

    const title = method === 'nequi' ? 'Depositar con Nequi' : 'Depositar USDT';
    const description = method === 'nequi' 
        ? 'Envía el dinero al número de Nequi y luego registra los detalles de tu pago.'
        : 'Selecciona una red para ver la dirección de depósito.';

    return (
        <div className="flex flex-col gap-4">
             <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ChevronLeft className="h-6 w-6" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight font-headline">{title}</h1>
                    <p className="text-muted-foreground">
                        {description}
                    </p>
                </div>
            </div>
            <Card>
                <CardContent className="pt-6">
                    {method === 'nequi' && <NequiDepositContent />}
                    {method === 'crypto' && <CryptoDepositContent />}
                </CardContent>
            </Card>
        </div>
    );
}

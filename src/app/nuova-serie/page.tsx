import { redirect } from 'next/navigation'

// La creazione di serie è stata spostata in /nuova-corsa (selettore di tipo)
export default function NuovaSeriePage() {
  redirect('/nuova-corsa')
}

'use client'

interface PaymentButtonProps {
  quizId: string
  price: number
  title: string
  className?: string
}

export default function PaymentButton({ 
  quizId, 
  price, 
  title, 
  className = "" 
}: PaymentButtonProps) {
  const handlePayment = async () => {
    // For now, simulate payment flow
    console.log(`Payment initiated for: ${title}`)
    console.log(`Amount: $${price}`)
    console.log(`Quiz ID: ${quizId}`)
    
    // Temporary alert - we'll replace with Stripe later
    alert(`Payment flow starting for "${title}" - $${price}\n\nThis will integrate with Stripe soon!`)
  }

  return (
    <button
      onClick={handlePayment}
      className={`bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors ${className}`}
    >
      Purchase Quiz - ${price}
    </button>
  )
}
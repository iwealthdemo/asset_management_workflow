import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { FileUpload } from "@/components/ui/file-upload"
import { Card, CardContent } from "@/components/ui/card"
import { insertInvestmentRequestSchema } from "@shared/schema"
import { z } from "zod"
import { useLocation } from "wouter"

const formSchema = insertInvestmentRequestSchema.omit({
  requestId: true,
  requesterId: true,
  currentApprovalStage: true,
  slaDeadline: true,
  status: true,
}).extend({
  expectedReturn: z.string().min(1, "Expected return is required"),
  amount: z.string().min(1, "Amount is required"),
})

type FormData = z.infer<typeof formSchema>

export function InvestmentForm() {
  const [, setLocation] = useLocation()
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      targetCompany: "",
      investmentType: "equity",
      amount: "",
      expectedReturn: "",
      description: "",
      riskLevel: "medium",
    },
  })

  const createInvestment = useMutation({
    mutationFn: async (data: FormData) => {
      console.log("Making API request with data:", data)
      // Keep amounts as strings for decimal validation
      const apiData = {
        ...data,
        amount: data.amount.toString(),
        expectedReturn: data.expectedReturn.toString(),
      }
      console.log("Converted API data:", apiData)
      const response = await apiRequest("POST", "/api/investments", apiData)
      console.log("API response:", response)
      const investment = await response.json()
      
      // Upload files if any
      if (uploadedFiles.length > 0) {
        console.log("Uploading files:", uploadedFiles)
        const formData = new FormData()
        uploadedFiles.forEach((file) => {
          formData.append('documents', file)
        })
        formData.append('requestType', 'investment')
        formData.append('requestId', investment.id.toString())
        
        const uploadResponse = await fetch('/api/documents/upload', {
          method: 'POST',
          body: formData,
          credentials: 'include',
        })
        
        if (!uploadResponse.ok) {
          throw new Error('Failed to upload documents')
        }
        
        console.log("Files uploaded successfully")
      }
      
      return investment
    },
    onSuccess: (investment) => {
      console.log("Investment created successfully:", investment)
      queryClient.invalidateQueries({ queryKey: ["/api/investments"] })
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] })
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/recent-requests"] })
      
      toast({
        title: "Investment request created",
        description: `Request ${investment.requestId} has been submitted for approval`,
      })
      
      setLocation("/")
    },
    onError: (error: any) => {
      console.error("Investment creation error:", error)
      toast({
        title: "Error creating investment request",
        description: error.message || "Something went wrong",
        variant: "destructive",
      })
    },
  })

  const saveDraft = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await apiRequest("POST", "/api/investments", {
        ...data,
        status: "draft",
      })
      return response.json()
    },
    onSuccess: () => {
      toast({
        title: "Draft saved",
        description: "Your investment request has been saved as a draft",
      })
    },
  })

  const onSubmit = (data: FormData) => {
    console.log("Form submission data:", data)
    console.log("Form errors:", form.formState.errors)
    console.log("Form is valid:", form.formState.isValid)
    createInvestment.mutate(data)
  }

  const onSaveDraft = () => {
    const currentData = form.getValues()
    saveDraft.mutate(currentData)
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="investmentType">Investment Type</Label>
              <Select 
                value={form.watch("investmentType")} 
                onValueChange={(value) => form.setValue("investmentType", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select investment type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="equity">Equity Investment</SelectItem>
                  <SelectItem value="debt">Debt Investment</SelectItem>
                  <SelectItem value="real_estate">Real Estate</SelectItem>
                  <SelectItem value="alternative">Alternative Investment</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.investmentType && (
                <p className="text-sm text-red-600">{form.formState.errors.investmentType.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetCompany">Target Company</Label>
              <Input
                id="targetCompany"
                placeholder="Enter company name"
                {...form.register("targetCompany")}
              />
              {form.formState.errors.targetCompany && (
                <p className="text-sm text-red-600">{form.formState.errors.targetCompany.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div className="space-y-2">
              <Label htmlFor="amount">Investment Amount ($)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...form.register("amount")}
              />
              {form.formState.errors.amount && (
                <p className="text-sm text-red-600">{form.formState.errors.amount.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="expectedReturn">Expected Return (%)</Label>
              <Input
                id="expectedReturn"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...form.register("expectedReturn")}
              />
              {form.formState.errors.expectedReturn && (
                <p className="text-sm text-red-600">{form.formState.errors.expectedReturn.message}</p>
              )}
            </div>
          </div>

          <div className="mt-6">
            <Label htmlFor="description">Investment Description</Label>
            <Textarea
              id="description"
              rows={4}
              placeholder="Describe the investment opportunity..."
              {...form.register("description")}
              className="mt-2"
            />
            {form.formState.errors.description && (
              <p className="text-sm text-red-600">{form.formState.errors.description.message}</p>
            )}
          </div>

          <div className="mt-6">
            <Label>Risk Assessment</Label>
            <RadioGroup
              value={form.watch("riskLevel")}
              onValueChange={(value) => form.setValue("riskLevel", value)}
              className="flex flex-row space-x-6 mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="low" id="low" />
                <Label htmlFor="low">Low Risk</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="medium" id="medium" />
                <Label htmlFor="medium">Medium Risk</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="high" id="high" />
                <Label htmlFor="high">High Risk</Label>
              </div>
            </RadioGroup>
            {form.formState.errors.riskLevel && (
              <p className="text-sm text-red-600">{form.formState.errors.riskLevel.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Document Upload */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-4">Supporting Documents</h3>
          <FileUpload
            multiple={true}
            accept=".pdf,.doc,.docx,.xls,.xlsx"
            maxSize={50 * 1024 * 1024}
            onFilesChange={setUploadedFiles}
          />
        </CardContent>
      </Card>

      {/* Form Actions */}
      <div className="flex items-center justify-end space-x-4 pt-6 border-t">
        <Button 
          type="button" 
          variant="outline"
          onClick={() => setLocation("/")}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={onSaveDraft}
          disabled={saveDraft.isPending}
        >
          {saveDraft.isPending ? "Saving..." : "Save as Draft"}
        </Button>
        <Button 
          type="submit" 
          disabled={createInvestment.isPending}
          onClick={(e) => {
            console.log("Submit button clicked!");
            console.log("Form state:", form.formState);
            console.log("Form values:", form.getValues());
          }}
        >
          {createInvestment.isPending ? "Submitting..." : "Submit for Approval"}
        </Button>
      </div>
    </form>
  )
}

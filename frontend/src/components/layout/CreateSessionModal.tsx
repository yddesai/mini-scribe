import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { PatientDetails } from '../../lib/types';

interface CreateSessionModalProps {
  isOpen: boolean;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (patient: PatientDetails) => Promise<void> | void;
}

const initialFormState: PatientDetails = {
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  sex: '',
  patientId: '',
};

export const CreateSessionModal: React.FC<CreateSessionModalProps> = ({
  isOpen,
  isSubmitting = false,
  onClose,
  onSubmit,
}) => {
  const [form, setForm] = useState<PatientDetails>(initialFormState);

  useEffect(() => {
    if (isOpen) {
      setForm(initialFormState);
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleChange = (field: keyof PatientDetails, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSubmit({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      dateOfBirth: form.dateOfBirth?.trim() || null,
      sex: form.sex?.trim() || null,
      patientId: form.patientId?.trim() || null,
    });
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#191919] shadow-2xl shadow-black/50">
        <div className="flex items-start justify-between border-b border-white/10 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-white">New Session</h2>
            <p className="mt-1 text-xs text-white/45">Enter patient details before recording.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-md p-1 text-white/40 transition-colors hover:bg-white/5 hover:text-white/70 disabled:opacity-30"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wide text-white/45">First Name</span>
              <input
                required
                value={form.firstName}
                onChange={(event) => handleChange('firstName', event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-white/20 focus:border-blue-500"
                placeholder="Jane"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wide text-white/45">Last Name</span>
              <input
                required
                value={form.lastName}
                onChange={(event) => handleChange('lastName', event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-white/20 focus:border-blue-500"
                placeholder="Doe"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wide text-white/45">DOB</span>
              <input
                type="date"
                value={form.dateOfBirth ?? ''}
                onChange={(event) => handleChange('dateOfBirth', event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-blue-500"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wide text-white/45">Sex</span>
              <select
                value={form.sex ?? ''}
                onChange={(event) => handleChange('sex', event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-blue-500"
              >
                <option value="" className="text-black">Select</option>
                <option value="Female" className="text-black">Female</option>
                <option value="Male" className="text-black">Male</option>
                <option value="Other" className="text-black">Other</option>
              </select>
            </label>
          </div>

          <label className="space-y-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wide text-white/45">Patient ID</span>
            <input
              value={form.patientId ?? ''}
              onChange={(event) => handleChange('patientId', event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-white/20 focus:border-blue-500"
              placeholder="Optional chart ID"
            />
          </label>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/60 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-30"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

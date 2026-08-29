import type { Gender } from '@saju/daeun';

type GenderSegmentProps = {
  value: Gender;
  onChange: (next: Gender) => void;
};

const CHOICES: readonly { gender: Gender; label: string }[] = [
  { gender: 'F', label: '여자' },
  { gender: 'M', label: '남자' },
];

const GenderSegment = ({ value, onChange }: GenderSegmentProps) => {
  return (
    <fieldset className="m-0 border-0 p-0">
      <legend className="mb-[9px] p-0 text-[13.5px] font-semibold">성별</legend>
      <div className="grid grid-cols-2 gap-2">
        {CHOICES.map(({ gender, label }) => {
          const handleChange = () => {
            onChange(gender);
          };

          return (
            <div key={gender} className="relative grid">
              <input
                type="radio"
                id={`gender-${gender}`}
                name="gender"
                className="peer absolute m-0 h-px w-px opacity-0"
                checked={value === gender}
                onChange={handleChange}
              />
              <label
                htmlFor={`gender-${gender}`}
                className="border-line bg-field text-ink-soft rounded-card peer-checked:border-accent peer-checked:bg-accent-soft peer-checked:text-accent peer-focus-visible:outline-accent grid h-12 cursor-pointer place-items-center border text-[15px] transition-colors peer-checked:font-semibold peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2"
              >
                {label}
              </label>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
};

export default GenderSegment;

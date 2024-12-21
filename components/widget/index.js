import PropTypes from 'prop-types';

const Widget = ({ title = null, description = null, right = null, children }) => {
  return (
    <div className="w-full p-4 mb-4 rounded-lg bg-gray-800 border border-gray-700">
      {(title || description || right) && (
        <div className="flex flex-row items-center justify-between mb-4">
          <div className="flex flex-col">
            {title && <div className="text-sm font-light text-gray-400">{title}</div>}
            {description && <div className="text-xl font-bold text-gray-100">{description}</div>}
          </div>
          {right}
        </div>
      )}
      <div className="text-gray-200">{children}</div>
    </div>
  );
};

Widget.propTypes = {
  title: PropTypes.any,
  description: PropTypes.any,
  right: PropTypes.any,
  children: PropTypes.any,
};

export default Widget;
